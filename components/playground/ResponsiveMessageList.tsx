"use client";

import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Check, Copy, Eye, EyeOff, GitBranch, GitCompareArrows, MoreHorizontal, Pencil, RefreshCw, RotateCcw, Volume2, X } from "lucide-react";

import { AgentActivity } from "@/components/playground/AgentActivity";
import { ChatOverlay } from "@/components/playground/ChatOverlay";
import { ErmaAttentionNotice } from "@/components/playground/ErmaAttentionNotice";
import { MessageList, type ChatMessage } from "@/components/playground/MessageList";
import AIThinkingBlock from "@/components/ui/ai-thinking-block";
import { useMobileViewport } from "@/hooks/use-mobile-viewport";
import type { ChatDictionary } from "@/lib/chat-i18n";
import type { Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const MarkdownMessage = lazy(() => import("@/components/playground/MarkdownMessage").then((module) => ({ default: module.MarkdownMessage })));
export type ResponsiveMessageListProps = {
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
  onToggleContext?: (message: ChatMessage) => void;
};

function AnswerBody({ content, pending, error = false }: { content: string; pending?: boolean; error?: boolean }) {
  return (
    <div className={cn("chat-markdown min-w-0 text-[15px] leading-[1.72]", error ? "text-error" : "text-primary")}>
      {content
        ? <Suspense fallback={<p className="whitespace-pre-wrap">{content}</p>}><MarkdownMessage content={content} /></Suspense>
        : pending ? <AIThinkingBlock label="Erma" /> : null}
    </div>
  );
}

function MobileMessageList(props: ResponsiveMessageListProps) {
  const {
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
  } = props;
  const [actionMessage, setActionMessage] = useState<ChatMessage | null>(null);
  const pressTimerRef = useRef<number | null>(null);
  const lastMessage = messages[messages.length - 1];
  const ru = locale === "ru";
  const labels = ru
    ? { actions: "Действия", edit: "Редактировать запрос", branch: "Создать ветку", regenerate: "Повторить ответ", previous: "Предыдущая версия", compare: "Сравнить модель", speak: "Озвучить", include: "Вернуть в контекст", exclude: "Исключить из контекста", primary: "Основной ответ", comparison: "Сравнение", stopped: "Генерация остановлена. Частичный ответ сохранён." }
    : { actions: "Actions", edit: "Edit prompt", branch: "Create branch", regenerate: "Regenerate", previous: "Previous version", compare: "Compare model", speak: "Read aloud", include: "Include in context", exclude: "Exclude from context", primary: "Primary answer", comparison: "Comparison", stopped: "Generation stopped. The partial answer was preserved." };
  const fallbackNotice = ru
    ? "Основная модель была временно недоступна. Ответ подготовлен резервным безопасным режимом."
    : "The primary model was temporarily unavailable. A safe fallback produced this answer.";

  function startLongPress(message: ChatMessage) {
    if (pressTimerRef.current) window.clearTimeout(pressTimerRef.current);
    pressTimerRef.current = window.setTimeout(() => {
      setActionMessage(message);
      navigator.vibrate?.(12);
    }, 500);
  }

  function cancelLongPress() {
    if (pressTimerRef.current) window.clearTimeout(pressTimerRef.current);
    pressTimerRef.current = null;
  }

  function runAction(action: () => void) {
    setActionMessage(null);
    action();
  }

  useEffect(() => () => {
    if (pressTimerRef.current) window.clearTimeout(pressTimerRef.current);
  }, []);

  return (
    <>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 pb-8" role="log" aria-label={text.chat.currentSession} lang={locale}>
        {messages.map((message) => message.role === "user" ? (
          <article
            key={message.id}
            className={cn("chat-message-enter flex justify-end", message.excludedFromContext && "opacity-60")}
            onPointerDown={() => startLongPress(message)}
            onPointerUp={cancelLongPress}
            onPointerCancel={cancelLongPress}
            onPointerMove={cancelLongPress}
            data-message-role="user"
          >
            <div className="max-w-[82%] rounded-[1.35rem] bg-surface-container-high px-4 py-3 text-primary shadow-[0_8px_20px_color-mix(in_srgb,var(--color-primary)_4%,transparent)]">
              <p className="whitespace-pre-wrap text-[15px] leading-[1.62]">{message.content}</p>
              {!isPending && (onEdit || onBranch || onToggleContext) ? (
                <div className="mt-1 flex justify-end">
                  <button type="button" onClick={() => setActionMessage(message)} className="grid size-9 place-items-center rounded-full text-on-secondary-container hover:bg-surface-container" aria-label={labels.actions}><MoreHorizontal size={16} /></button>
                </div>
              ) : null}
            </div>
          </article>
        ) : (
          <article
            key={message.id}
            className={cn("chat-message-enter min-w-0", message.excludedFromContext && "opacity-60")}
            onPointerDown={() => startLongPress(message)}
            onPointerUp={cancelLongPress}
            onPointerCancel={cancelLongPress}
            onPointerMove={cancelLongPress}
            data-message-role="assistant"
          >
            <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-on-secondary-container">
              <span className="grid size-7 place-items-center rounded-full bg-primary text-[10px] text-on-primary shadow-sm">E</span>
              <span>Erma</span>
              {message.versions?.length ? <span className="ml-auto rounded-full bg-surface-container-low px-2 py-1 text-[10px] normal-case tracking-normal">{message.versions.length + 1}</span> : null}
            </div>

            {message.comparison ? (
              <div className="space-y-3" data-model-comparison>
                <details open className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-4"><summary className="cursor-pointer list-none text-[11px] font-semibold uppercase tracking-[0.08em] text-on-secondary-container">{labels.primary}</summary><div className="mt-3"><AnswerBody content={message.content} pending={isPending && message.id === lastMessage?.id} error={message.error} /></div></details>
                <details className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-4"><summary className="cursor-pointer list-none text-[11px] font-semibold uppercase tracking-[0.08em] text-on-secondary-container">{labels.comparison} · {message.comparison.model}</summary><div className="mt-3"><AnswerBody content={message.comparison.content} pending={message.comparison.pending} error={message.comparison.error} /></div></details>
              </div>
            ) : (
              <AnswerBody content={message.content} pending={isPending && message.id === lastMessage?.id} error={message.error} />
            )}

            {message.stopped && <p className="mt-3 rounded-xl bg-surface-container-low px-3 py-2 text-[11px] text-on-secondary-container">{labels.stopped}</p>}
            {message.meta?.fallbackReason && <p className="mt-3 rounded-xl border border-outline-variant bg-surface-container-low px-3 py-2 text-[11px] leading-5 text-on-secondary-container">{fallbackNotice}</p>}
            <AgentActivity calls={message.meta?.toolCalls} locale={locale} />

            {message.error ? (
              <div className="mt-3">
                {onRetry && <button type="button" onClick={() => onRetry(message)} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-error/50 px-4 text-[12px] text-error"><RefreshCw size={14} />{text.chat.retry}</button>}
              </div>
            ) : message.content ? (
              <div className="mt-3 flex items-center gap-1 text-on-secondary-container" aria-label={labels.actions}>
                <button type="button" onClick={() => onCopy(message)} className="grid size-10 place-items-center rounded-full hover:bg-surface-container-low hover:text-primary" aria-label={copiedMessageId === message.id ? text.chat.copied : text.chat.copy}>{copiedMessageId === message.id ? <Check size={15} /> : <Copy size={15} />}</button>
                {onRegenerate && !isPending && <button type="button" onClick={() => onRegenerate(message)} className="grid size-10 place-items-center rounded-full hover:bg-surface-container-low hover:text-primary" aria-label={labels.regenerate}><RefreshCw size={15} /></button>}
                <button type="button" onClick={() => setActionMessage(message)} className="grid size-10 place-items-center rounded-full hover:bg-surface-container-low hover:text-primary" aria-label={labels.actions}><MoreHorizontal size={17} /></button>
              </div>
            ) : null}
            {speechNotice && speakingMessageId === message.id && <p className="mt-2 text-[11px] text-on-secondary-container" role="status">{speechNotice}</p>}
          </article>
        ))}
      </div>

      <ChatOverlay open={Boolean(actionMessage)} onClose={() => setActionMessage(null)} labelledBy="mobile-message-actions-title" position="sheet" className="p-3" closeLabel={text.chat.close}>
        {actionMessage && (
          <div>
            <div className="flex items-center justify-between gap-3 border-b border-outline-variant px-2 pb-3">
              <div><p className="label-caps text-on-secondary-container">ERMA CHAT</p><h2 id="mobile-message-actions-title" className="mt-1 text-lg font-medium text-primary">{labels.actions}</h2></div>
              <button type="button" onClick={() => setActionMessage(null)} className="grid size-11 place-items-center rounded-full text-primary hover:bg-surface-container-low" aria-label={text.chat.close}><X size={17} /></button>
            </div>
            <div className="space-y-1 px-1 py-3">
              {actionMessage.role === "user" && onEdit && <button type="button" onClick={() => runAction(() => onEdit(actionMessage))} className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm hover:bg-surface-container-low"><Pencil size={17} />{labels.edit}</button>}
              {actionMessage.role === "assistant" && <button type="button" onClick={() => runAction(() => onSpeak(actionMessage))} className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm hover:bg-surface-container-low"><Volume2 size={17} />{labels.speak}</button>}
              {actionMessage.role === "assistant" && onRegenerate && !isPending && <button type="button" onClick={() => runAction(() => onRegenerate(actionMessage))} className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm hover:bg-surface-container-low"><RefreshCw size={17} />{labels.regenerate}</button>}
              {actionMessage.role === "assistant" && onRestorePrevious && actionMessage.versions?.length ? <button type="button" onClick={() => runAction(() => onRestorePrevious(actionMessage))} className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm hover:bg-surface-container-low"><RotateCcw size={17} />{labels.previous}</button> : null}
              {onBranch && <button type="button" onClick={() => runAction(() => onBranch(actionMessage))} className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm hover:bg-surface-container-low"><GitBranch size={17} />{labels.branch}</button>}
              {actionMessage.role === "assistant" && onOpenWorkspace && <button type="button" onClick={() => runAction(() => onOpenWorkspace(actionMessage))} className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm hover:bg-surface-container-low"><GitCompareArrows size={17} />{labels.compare}</button>}
              {onToggleContext && !isPending && <button type="button" onClick={() => runAction(() => onToggleContext(actionMessage))} className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm hover:bg-surface-container-low">{actionMessage.excludedFromContext ? <Eye size={17} /> : <EyeOff size={17} />}{actionMessage.excludedFromContext ? labels.include : labels.exclude}</button>}
            </div>
          </div>
        )}
      </ChatOverlay>
    </>
  );
}

export function ResponsiveMessageList(props: ResponsiveMessageListProps) {
  const mobile = useMobileViewport();
  return (
    <>
      <ErmaAttentionNotice messages={props.messages} locale={props.locale} />
      {mobile ? <MobileMessageList {...props} /> : <MessageList {...props} />}
    </>
  );
}
