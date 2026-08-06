"use client";

import Image from "next/image";
import { lazy, Suspense } from "react";
import {
  Check,
  Copy,
  Eye,
  EyeOff,
  GitBranch,
  GitCompareArrows,
  History,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  RotateCcw,
  Volume2,
} from "lucide-react";

import { AgentActivity } from "@/components/playground/AgentActivity";
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

function ContextAction({ message, locale, onToggle }: { message: ChatMessage; locale: Locale; onToggle: (message: ChatMessage) => void }) {
  const excluded = message.excludedFromContext === true;
  const label = locale === "ru"
    ? excluded ? "Вернуть в контекст" : "Исключить из контекста"
    : excluded ? "Include in context" : "Exclude from context";
  return (
    <button type="button" onClick={() => onToggle(message)} className="flex min-h-10 w-full items-center gap-2 rounded-xl px-3 text-left text-[12px] hover:bg-surface-container-low">
      {excluded ? <Eye size={14} /> : <EyeOff size={14} />}{label}
    </button>
  );
}

function AnswerBody({ content, pending, error = false }: { content: string; pending?: boolean; error?: boolean }) {
  return (
    <div className={cn("chat-markdown min-w-0 text-[15px] leading-[1.75]", error ? "text-error" : "text-primary")}>
      {content
        ? <Suspense fallback={<p className="whitespace-pre-wrap">{content}</p>}><MarkdownMessage content={content} /></Suspense>
        : pending ? <AIThinkingBlock label="Erma" /> : null}
    </div>
  );
}

function ActionMenu({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <details className="group relative">
      <summary className="grid size-9 cursor-pointer list-none place-items-center rounded-full text-on-secondary-container hover:bg-surface-container-low hover:text-primary [&::-webkit-details-marker]:hidden" aria-label={label}>
        <MoreHorizontal size={16} />
      </summary>
      <div className="absolute right-0 top-10 z-30 w-56 rounded-2xl border border-outline-variant bg-surface-container-lowest p-1.5 shadow-xl">
        {children}
      </div>
    </details>
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
  const lastMessage = messages[messages.length - 1];
  const ui = locale === "ru"
    ? { actions: "Действия", branch: "Создать ветку", regenerate: "Повторить ответ", previous: "Предыдущая версия", compare: "Сравнить модель", stopped: "Генерация остановлена. Частичный ответ сохранён.", versions: "версий", original: "Основной ответ", comparison: "Сравнение", edit: "Редактировать запрос", speak: "Озвучить" }
    : { actions: "Actions", branch: "Create branch", regenerate: "Regenerate", previous: "Previous version", compare: "Compare model", stopped: "Generation stopped. The partial answer was preserved.", versions: "versions", original: "Primary answer", comparison: "Comparison", edit: "Edit prompt", speak: "Read aloud" };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-7 pb-10 md:gap-9 md:pb-8" role="log" aria-label={text.chat.currentSession} lang={locale}>
      {messages.map((message) => message.role === "user" ? (
        <article key={message.id} className={cn("chat-message-enter flex justify-end", message.excludedFromContext && "opacity-60")}>
          <div className="max-w-[94%] rounded-3xl border border-outline-variant bg-surface-container-low px-5 py-4 sm:max-w-[82%] sm:px-6">
            <p className="whitespace-pre-wrap text-[15px] leading-[1.7] text-primary">{message.content}</p>
            {!isPending && (onEdit || onBranch || onToggleContext) ? (
              <div className="mt-2 flex justify-end">
                <ActionMenu label={ui.actions}>
                  {onEdit && <button type="button" onClick={() => onEdit(message)} className="flex min-h-10 w-full items-center gap-2 rounded-xl px-3 text-left text-[12px] hover:bg-surface-container-low"><Pencil size={14} />{ui.edit}</button>}
                  {onBranch && <button type="button" onClick={() => onBranch(message)} className="flex min-h-10 w-full items-center gap-2 rounded-xl px-3 text-left text-[12px] hover:bg-surface-container-low"><GitBranch size={14} />{ui.branch}</button>}
                  {onToggleContext && <ContextAction message={message} locale={locale} onToggle={onToggleContext} />}
                </ActionMenu>
              </div>
            ) : null}
          </div>
        </article>
      ) : (
        <article key={message.id} className={cn("chat-message-enter flex justify-start", message.excludedFromContext && "opacity-60")}>
          <div className={cn("assistant-message-card w-full max-w-full rounded-3xl border bg-surface-container-lowest px-5 py-5 sm:px-6", message.error ? "border-error/60" : "border-outline-variant")}>
            <div className="mb-4 flex items-center gap-3">
              <span className="grid size-8 place-items-center overflow-hidden rounded-xl border border-outline-variant bg-surface-container-low p-1.5"><Image src="/images/models/model-mark.png" alt="" width={24} height={24} className="size-full object-contain" /></span>
              <span className="label-caps text-on-secondary-container">ERMA</span>
              {message.versions?.length ? <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-surface-container-low px-2 py-1 text-[10px] text-on-secondary-container"><History size={11} /> {message.versions.length + 1} {ui.versions}</span> : null}
            </div>

            {message.comparison ? (
              <div className="grid gap-4 md:grid-cols-2" data-model-comparison>
                <section className="min-w-0 rounded-2xl border border-outline-variant bg-surface p-4"><p className="label-caps mb-3 text-on-secondary-container">{ui.original}</p><AnswerBody content={message.content} pending={isPending && message.id === lastMessage?.id} error={message.error} /></section>
                <section className="min-w-0 rounded-2xl border border-outline-variant bg-surface p-4"><p className="label-caps mb-3 flex items-center justify-between gap-2 text-on-secondary-container"><span>{ui.comparison}</span><span className="truncate normal-case tracking-normal">{message.comparison.model}</span></p><AnswerBody content={message.comparison.content} pending={message.comparison.pending} error={message.comparison.error} /></section>
              </div>
            ) : <AnswerBody content={message.content} pending={isPending && message.id === lastMessage?.id} error={message.error} />}

            {message.stopped && <p className="mt-3 rounded-xl bg-surface-container-low px-3 py-2 text-[11px] text-on-secondary-container">{ui.stopped}</p>}
            <AgentActivity calls={message.meta?.toolCalls} locale={locale} />

            {message.error ? (
              <div className="mt-4 border-t border-error/20 pt-4">
                {onRetry && <button type="button" onClick={() => onRetry(message)} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-error/50 px-4 text-[12px] text-error hover:bg-error/10"><RefreshCw size={14} /> {text.chat.retry}</button>}
              </div>
            ) : message.content ? (
              <div className="mt-5 flex items-center gap-1 border-t border-outline-variant pt-3 text-[11px] text-on-secondary-container">
                <button type="button" onClick={() => onCopy(message)} className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-2.5 hover:bg-surface-container-low hover:text-primary">{copiedMessageId === message.id ? <Check size={13} /> : <Copy size={13} />}{copiedMessageId === message.id ? text.chat.copied : text.chat.copy}</button>
                {onRegenerate && !isPending && <button type="button" onClick={() => onRegenerate(message)} className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-2.5 hover:bg-surface-container-low hover:text-primary"><RefreshCw size={13} />{ui.regenerate}</button>}
                <div className="ml-auto">
                  <ActionMenu label={ui.actions}>
                    <button type="button" onClick={() => onSpeak(message)} className="flex min-h-10 w-full items-center gap-2 rounded-xl px-3 text-left text-[12px] hover:bg-surface-container-low"><Volume2 size={14} />{speakingMessageId === message.id ? text.chat.stopSpeaking : ui.speak}</button>
                    {onRestorePrevious && message.versions?.length ? <button type="button" onClick={() => onRestorePrevious(message)} className="flex min-h-10 w-full items-center gap-2 rounded-xl px-3 text-left text-[12px] hover:bg-surface-container-low"><RotateCcw size={14} />{ui.previous}</button> : null}
                    {onBranch && <button type="button" onClick={() => onBranch(message)} className="flex min-h-10 w-full items-center gap-2 rounded-xl px-3 text-left text-[12px] hover:bg-surface-container-low"><GitBranch size={14} />{ui.branch}</button>}
                    {onOpenWorkspace && <button type="button" onClick={() => onOpenWorkspace(message)} className="flex min-h-10 w-full items-center gap-2 rounded-xl px-3 text-left text-[12px] hover:bg-surface-container-low"><GitCompareArrows size={14} />{ui.compare}</button>}
                    {onToggleContext && !isPending && <ContextAction message={message} locale={locale} onToggle={onToggleContext} />}
                  </ActionMenu>
                </div>
              </div>
            ) : null}
            {speechNotice && speakingMessageId === message.id && <p className="mt-2 text-[11px] text-on-secondary-container" role="status">{speechNotice}</p>}
          </div>
        </article>
      ))}
    </div>
  );
}
