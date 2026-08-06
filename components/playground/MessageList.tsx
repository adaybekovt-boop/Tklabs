"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  Copy,
  Eye,
  EyeOff,
  GitBranch,
  GitCompareArrows,
  History,
  Info,
  Pencil,
  RefreshCw,
  RotateCcw,
  Volume2,
  X,
} from "lucide-react";

import { ChatOverlay } from "@/components/playground/ChatOverlay";
import { ToolCallCards } from "@/components/playground/ToolCallCards";
import AIThinkingBlock from "@/components/ui/ai-thinking-block";
import type { AiResponseMeta } from "@/lib/ai/types";
import { getDictionary, type Locale } from "@/lib/i18n";
import type { ArchivedMessageComparison, ArchivedMessageVersion } from "@/lib/local-archive";
import { cn } from "@/lib/utils";

const MarkdownMessage = lazy(() => import("@/components/playground/MarkdownMessage").then((module) => ({ default: module.MarkdownMessage })));

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  error?: boolean;
  stopped?: boolean;
  excludedFromContext?: boolean;
  versions?: ArchivedMessageVersion[];
  comparison?: ArchivedMessageComparison;
  meta?: AiResponseMeta;
  requestId?: string;
  retryAfterSeconds?: number;
  retryPrompt?: string;
  retryModel?: string;
};

type ChatDictionary = ReturnType<typeof getDictionary>;

function RetryCountdown({ seconds, label }: { seconds: number; label: string }) {
  const [remaining, setRemaining] = useState(Math.max(1, Math.ceil(seconds)));
  useEffect(() => {
    const timer = window.setInterval(() => setRemaining((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, []);
  return remaining > 0 ? <span className="text-error">{label} {remaining}s</span> : null;
}

function ContextButton({ message, locale, onToggle, compact = false }: { message: ChatMessage; locale: Locale; onToggle: (message: ChatMessage) => void; compact?: boolean }) {
  const excluded = message.excludedFromContext === true;
  const label = locale === "ru" ? excluded ? "Вернуть в контекст" : "Исключить из контекста" : excluded ? "Include in context" : "Exclude from context";
  return (
    <button type="button" onClick={() => onToggle(message)} aria-pressed={excluded} className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-2.5 py-1.5 transition-colors hover:bg-surface-container-low hover:text-primary" title={label}>
      {excluded ? <Eye size={13} /> : <EyeOff size={13} />}
      {!compact && label}
    </button>
  );
}

function AnswerBody({ content, pending, error = false }: { content: string; pending?: boolean; error?: boolean }) {
  return (
    <div className={cn("chat-markdown min-w-0 text-[15px] leading-[1.75]", error ? "text-error" : "text-primary")}>
      {content ? <Suspense fallback={<p className="whitespace-pre-wrap">{content}</p>}><MarkdownMessage content={content} /></Suspense> : pending ? <AIThinkingBlock label="Generating" /> : null}
    </div>
  );
}

export function MessageList({
  messages,
  isPending,
  locale,
  text,
  copiedMessageId,
  speakingMessageId,
  speechNotice,
  onCopy,
  onSpeak,
  onRetry,
  onRegenerate,
  onRestorePrevious,
  onEdit,
  onBranch,
  onOpenWorkspace,
  onCopyRequestId,
  onToggleContext,
}: {
  messages: ChatMessage[];
  isPending: boolean;
  locale: Locale;
  text: ChatDictionary;
  copiedMessageId: string | null;
  speakingMessageId: string | null;
  speechNotice: string;
  onCopy: (message: ChatMessage) => void;
  onSpeak: (message: ChatMessage) => void;
  onRetry?: (message: ChatMessage) => void;
  onRegenerate?: (message: ChatMessage) => void;
  onRestorePrevious?: (message: ChatMessage) => void;
  onEdit?: (message: ChatMessage) => void;
  onBranch?: (message: ChatMessage) => void;
  onOpenWorkspace?: (message: ChatMessage) => void;
  onCopyRequestId?: (message: ChatMessage) => void;
  onToggleContext?: (message: ChatMessage) => void;
}) {
  const router = useRouter();
  const [actionMessage, setActionMessage] = useState<ChatMessage | null>(null);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastMessage = messages[messages.length - 1];
  const ui = locale === "ru"
    ? { details: "Подробности", branch: "Ответвить", regenerate: "Повторить / новая версия", previous: "Предыдущая версия", compare: "Сравнить модели", stopped: "Генерация остановлена. Частичный ответ сохранён.", versions: "версий", close: "Закрыть действия", original: "Основная модель", comparison: "Сравнение", technical: "Технические данные" }
    : { details: "Details", branch: "Branch", regenerate: "Retry / new version", previous: "Previous version", compare: "Compare models", stopped: "Generation stopped. The partial answer was preserved.", versions: "versions", close: "Close actions", original: "Primary model", comparison: "Comparison", technical: "Technical details" };

  function clearHoldTimer() {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    holdTimerRef.current = null;
  }

  function holdProps(message: ChatMessage) {
    return {
      onPointerDown: (event: React.PointerEvent<HTMLElement>) => {
        if (event.pointerType === "mouse") return;
        clearHoldTimer();
        holdTimerRef.current = setTimeout(() => setActionMessage(message), 520);
      },
      onPointerUp: clearHoldTimer,
      onPointerCancel: clearHoldTimer,
      onPointerMove: clearHoldTimer,
      onContextMenu: (event: React.MouseEvent<HTMLElement>) => {
        if (window.innerWidth >= 768) return;
        event.preventDefault();
        setActionMessage(message);
      },
    };
  }

  function closeActions() {
    clearHoldTimer();
    setActionMessage(null);
  }

  function runMobileAction(action: (() => void) | undefined) {
    closeActions();
    action?.();
  }

  return (
    <>
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 pb-10 md:gap-10 md:pb-8" role="log" aria-label={text.chat.currentSession} lang={locale}>
        {messages.map((message) => message.role === "user" ? (
          <article key={message.id} {...holdProps(message)} className={cn("chat-message-enter flex justify-end", message.excludedFromContext && "opacity-60")}>
            <div className="max-w-[94%] rounded-3xl border border-outline-variant bg-surface-container-low px-5 py-4 shadow-[0_14px_40px_color-mix(in_srgb,var(--color-primary)_5%,transparent)] sm:max-w-[82%] sm:px-6">
              <p className="whitespace-pre-wrap text-[15px] leading-[1.7] text-primary">{message.content}</p>
              {(onEdit || onToggleContext || onBranch) && !isPending && (
                <div className="mt-2 hidden flex-wrap items-center gap-1 text-[11px] text-on-secondary-container sm:flex">
                  {onEdit && <button type="button" onClick={() => onEdit(message)} className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-2.5 transition-colors hover:bg-surface-container hover:text-primary"><Pencil size={13} /> {text.chat.edit}</button>}
                  {onBranch && <button type="button" onClick={() => onBranch(message)} className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-2.5 transition-colors hover:bg-surface-container hover:text-primary"><GitBranch size={13} /> {ui.branch}</button>}
                  {onToggleContext && <ContextButton message={message} locale={locale} onToggle={onToggleContext} compact />}
                </div>
              )}
            </div>
          </article>
        ) : (
          <article key={message.id} {...holdProps(message)} className={cn("chat-message-enter flex justify-start", message.excludedFromContext && "opacity-60")}>
            <div className={cn("assistant-message-card max-w-full rounded-3xl border bg-surface-container-lowest px-5 py-5 shadow-[0_16px_48px_color-mix(in_srgb,var(--color-primary)_5%,transparent)] sm:px-6", message.error ? "border-error/60" : "border-outline-variant")}>
              <div className="mb-4 flex items-center gap-3">
                <span className="grid size-8 place-items-center overflow-hidden rounded-xl border border-outline-variant bg-surface-container-low p-1.5"><Image src="/images/models/model-mark.png" alt="" width={24} height={24} className="size-full object-contain" /></span>
                <span className="label-caps text-on-secondary-container">TK LABS AI</span>
                {message.versions?.length ? <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-surface-container-low px-2 py-1 text-[10px] text-on-secondary-container"><History size={11} /> {message.versions.length + 1} {ui.versions}</span> : null}
              </div>

              {message.comparison ? (
                <div className="grid gap-4 md:grid-cols-2" data-model-comparison>
                  <section className="min-w-0 rounded-2xl border border-outline-variant bg-surface p-4"><p className="label-caps mb-3 text-on-secondary-container">{ui.original}</p><AnswerBody content={message.content} pending={isPending && message.id === lastMessage?.id} error={message.error} /></section>
                  <section className="min-w-0 rounded-2xl border border-outline-variant bg-surface p-4"><p className="label-caps mb-3 flex items-center justify-between gap-2 text-on-secondary-container"><span>{ui.comparison}</span><span className="truncate normal-case tracking-normal">{message.comparison.model}</span></p><AnswerBody content={message.comparison.content} pending={message.comparison.pending} error={message.comparison.error} /></section>
                </div>
              ) : <AnswerBody content={message.content} pending={isPending && message.id === lastMessage?.id} error={message.error} />}

              {message.stopped && <p className="mt-3 rounded-xl bg-surface-container-low px-3 py-2 text-[11px] text-on-secondary-container">{ui.stopped}</p>}
              <ToolCallCards calls={message.meta?.toolCalls} locale={locale} />

              {message.error ? (
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-error/20 pt-4 text-[11px]">
                  {onRetry && <button type="button" onClick={() => onRetry(message)} className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-error/50 px-3 text-error transition-colors hover:bg-error/10"><RefreshCw size={13} /> {text.chat.retry}</button>}
                  {message.retryAfterSeconds && message.retryAfterSeconds > 0 && <RetryCountdown seconds={message.retryAfterSeconds} label={text.chat.retryIn} />}
                  <button type="button" onClick={() => router.push("/playground")} className="min-h-9 rounded-full px-3 text-error transition-colors hover:bg-error/10">{text.chat.newDialog}</button>
                </div>
              ) : message.content ? (
                <div className="mt-5 border-t border-outline-variant pt-3 text-[11px] text-on-secondary-container">
                  <div className="hidden flex-wrap items-center gap-1 sm:flex" data-compact-message-actions>
                    <button type="button" onClick={() => onCopy(message)} className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-2.5 py-1.5 transition-colors hover:bg-surface-container-low hover:text-primary">{copiedMessageId === message.id ? <Check size={13} /> : <Copy size={13} />}{copiedMessageId === message.id ? text.chat.copied : text.chat.copy}</button>
                    <button type="button" onClick={() => onSpeak(message)} aria-pressed={speakingMessageId === message.id} className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-2.5 py-1.5 transition-colors hover:bg-surface-container-low hover:text-primary"><Volume2 size={13} />{speakingMessageId === message.id ? text.chat.stopSpeaking : text.chat.speak}</button>
                    {onRegenerate && !isPending && <button type="button" onClick={() => onRegenerate(message)} className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-2.5 transition-colors hover:bg-surface-container-low hover:text-primary"><RefreshCw size={13} />{ui.regenerate}</button>}
                    {onRestorePrevious && message.versions?.length ? <button type="button" onClick={() => onRestorePrevious(message)} className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-2.5 transition-colors hover:bg-surface-container-low hover:text-primary"><RotateCcw size={13} />{ui.previous}</button> : null}
                    {onBranch && <button type="button" onClick={() => onBranch(message)} className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-2.5 transition-colors hover:bg-surface-container-low hover:text-primary"><GitBranch size={13} />{ui.branch}</button>}
                    {onOpenWorkspace && <button type="button" onClick={() => onOpenWorkspace(message)} className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-2.5 transition-colors hover:bg-surface-container-low hover:text-primary"><GitCompareArrows size={13} />{ui.compare}</button>}
                    {onToggleContext && !isPending && <ContextButton message={message} locale={locale} onToggle={onToggleContext} compact />}
                  </div>

                  <details className="group mt-1 rounded-xl" data-message-details>
                    <summary className="flex min-h-9 cursor-pointer list-none items-center gap-2 rounded-xl px-2.5 text-on-secondary-container hover:bg-surface-container-low hover:text-primary [&::-webkit-details-marker]:hidden"><Info size={13} />{ui.details}<ChevronDown size={13} className="ml-auto transition-transform group-open:rotate-180" /></summary>
                    <div className="space-y-1.5 px-3 pb-2 pt-1 text-[11px] leading-5 text-on-secondary-container">
                      {message.meta?.actualModel && <p>{text.chat.usedModel}: {message.meta.actualModel}</p>}
                      {message.meta?.actualProvider && <p>Provider: {message.meta.actualProvider}</p>}
                      {message.requestId && <div className="flex items-center gap-2"><span className="min-w-0 flex-1 truncate">Request ID: {message.requestId}</span>{onCopyRequestId && <button type="button" onClick={() => onCopyRequestId(message)} className="inline-flex min-h-8 items-center gap-1 rounded-full px-2 hover:bg-surface-container"><Copy size={12} />Copy</button>}</div>}
                      {typeof message.meta?.latencyMs === "number" && <p>Latency: {Math.max(0, Math.round(message.meta.latencyMs))}ms</p>}
                      {typeof message.meta?.timeToFirstTokenMs === "number" && <p>TTFT: {Math.max(0, Math.round(message.meta.timeToFirstTokenMs))}ms</p>}
                      {typeof message.meta?.inputTokens === "number" && <p>{locale === "ru" ? "Токены" : "Tokens"}: {message.meta.inputTokens}{typeof message.meta.outputTokens === "number" ? ` + ${message.meta.outputTokens}` : ""}</p>}
                      {message.meta?.contextCompacted && <p>{locale === "ru" ? "Старые сообщения свёрнуты в память контекста." : "Older messages were compacted into context memory."}</p>}
                      {message.meta?.reasoningUsed && <p>{text.chat.reasoningUsed}</p>}
                      {message.meta?.fallbackReason && <p className="text-error">{text.chat.fallbackNotice}</p>}
                    </div>
                  </details>
                  {speechNotice && message.id === lastMessage?.id && <span className="text-error">{speechNotice}</span>}
                </div>
              ) : null}
            </div>
          </article>
        ))}
        <div className="sr-only" aria-live="polite" aria-atomic="true">{isPending ? text.chat.generating : ""}</div>
      </div>

      <ChatOverlay open={Boolean(actionMessage)} onClose={closeActions} labelledBy="mobile-message-actions-title" position="sheet" closeLabel={ui.close}>
        {actionMessage && (
          <div>
            <div className="mb-3 flex items-center justify-between gap-3 border-b border-outline-variant pb-3"><h2 id="mobile-message-actions-title" className="text-lg font-medium text-primary">{actionMessage.role === "user" ? (locale === "ru" ? "Действия с сообщением" : "Message actions") : (locale === "ru" ? "Действия с ответом" : "Answer actions")}</h2><button type="button" onClick={closeActions} className="grid size-10 place-items-center rounded-full text-primary hover:bg-surface-container-low" aria-label={ui.close}><X size={16} /></button></div>
            <div className="grid gap-2">
              <button type="button" onClick={() => runMobileAction(() => onCopy(actionMessage))} className="flex min-h-12 items-center gap-3 rounded-2xl border border-outline-variant px-4 text-left text-sm text-primary"><Copy size={16} />{text.chat.copy}</button>
              {actionMessage.role === "user" && onEdit && <button type="button" onClick={() => runMobileAction(() => onEdit(actionMessage))} className="flex min-h-12 items-center gap-3 rounded-2xl border border-outline-variant px-4 text-left text-sm text-primary"><Pencil size={16} />{text.chat.edit}</button>}
              {actionMessage.role === "assistant" && onRegenerate && <button type="button" onClick={() => runMobileAction(() => onRegenerate(actionMessage))} className="flex min-h-12 items-center gap-3 rounded-2xl border border-outline-variant px-4 text-left text-sm text-primary"><RefreshCw size={16} />{ui.regenerate}</button>}
              {actionMessage.role === "assistant" && onRestorePrevious && actionMessage.versions?.length ? <button type="button" onClick={() => runMobileAction(() => onRestorePrevious(actionMessage))} className="flex min-h-12 items-center gap-3 rounded-2xl border border-outline-variant px-4 text-left text-sm text-primary"><RotateCcw size={16} />{ui.previous}</button> : null}
              {onBranch && <button type="button" onClick={() => runMobileAction(() => onBranch(actionMessage))} className="flex min-h-12 items-center gap-3 rounded-2xl border border-outline-variant px-4 text-left text-sm text-primary"><GitBranch size={16} />{ui.branch}</button>}
              {actionMessage.role === "assistant" && onOpenWorkspace && <button type="button" onClick={() => runMobileAction(() => onOpenWorkspace(actionMessage))} className="flex min-h-12 items-center gap-3 rounded-2xl border border-outline-variant px-4 text-left text-sm text-primary"><GitCompareArrows size={16} />{ui.compare}</button>}
              {onToggleContext && <button type="button" onClick={() => runMobileAction(() => onToggleContext(actionMessage))} className="flex min-h-12 items-center gap-3 rounded-2xl border border-outline-variant px-4 text-left text-sm text-primary">{actionMessage.excludedFromContext ? <Eye size={16} /> : <EyeOff size={16} />}{actionMessage.excludedFromContext ? (locale === "ru" ? "Вернуть в контекст" : "Include in context") : (locale === "ru" ? "Исключить из контекста" : "Exclude from context")}</button>}
            </div>
          </div>
        )}
      </ChatOverlay>
    </>
  );
}
