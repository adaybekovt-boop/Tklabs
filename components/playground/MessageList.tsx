"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { lazy, Suspense, useEffect, useState } from "react";
import { Check, Copy, Pencil, RefreshCw, Volume2 } from "lucide-react";

import AIThinkingBlock from "@/components/ui/ai-thinking-block";
import type { AiResponseMeta } from "@/lib/ai/types";
import { getDictionary, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const MarkdownMessage = lazy(() => import("@/components/playground/MarkdownMessage").then((module) => ({ default: module.MarkdownMessage })));

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  error?: boolean;
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
  onEdit,
  onCopyRequestId,
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
  onEdit?: (message: ChatMessage) => void;
  onCopyRequestId?: (message: ChatMessage) => void;
}) {
  const router = useRouter();
  const lastMessage = messages[messages.length - 1];
  const lastUserMessageId = [...messages].reverse().find((message) => message.role === "user")?.id;
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 pb-10 md:gap-10 md:pb-8" role="log" aria-label={text.chat.currentSession} lang={locale}>
      {messages.map((message) =>
        message.role === "user" ? (
          <article key={message.id} className="chat-message-enter flex justify-end">
            <div className="max-w-[94%] rounded-3xl border border-outline-variant bg-surface-container-low px-5 py-4 shadow-[0_14px_40px_color-mix(in_srgb,var(--color-primary)_5%,transparent)] sm:max-w-[82%] sm:px-6">
              <p className="whitespace-pre-wrap text-[15px] leading-[1.7] text-primary">{message.content}</p>
              {onEdit && message.id === lastUserMessageId && !isPending && (
                <button type="button" onClick={() => onEdit(message)} className="mt-3 inline-flex min-h-9 items-center gap-1.5 rounded-full px-2.5 text-[11px] text-on-secondary-container transition-colors hover:bg-surface-container hover:text-primary">
                  <Pencil size={13} /> {text.chat.edit}
                </button>
              )}
            </div>
          </article>
        ) : (
          <article key={message.id} className="chat-message-enter flex justify-start">
            <div className={cn("assistant-message-card max-w-[98%] rounded-3xl border bg-surface-container-lowest px-5 py-5 shadow-[0_16px_48px_color-mix(in_srgb,var(--color-primary)_5%,transparent)] sm:max-w-[92%] sm:px-6", message.error ? "border-error/60" : "border-outline-variant")}>
              <div className="mb-4 flex items-center gap-3">
                <span className="grid size-8 place-items-center overflow-hidden rounded-xl border border-outline-variant bg-surface-container-low p-1.5">
                  <Image src="/images/models/model-mark.png" alt="" width={24} height={24} className="size-full object-contain" />
                </span>
                <span className="label-caps text-on-secondary-container">TK LABS AI</span>
                {message.meta?.actualProvider && <span className="ml-auto text-[10px] uppercase tracking-[0.08em] text-on-secondary-container">{message.meta.actualProvider}</span>}
              </div>
              <div className={cn("chat-markdown text-[15px] leading-[1.75]", message.error ? "text-error" : "text-primary")}>
                {message.content ? <Suspense fallback={<p className="whitespace-pre-wrap">{message.content}</p>}><MarkdownMessage content={message.content} /></Suspense> : isPending && message.id === lastMessage?.id ? <AIThinkingBlock label={text.chat.thinking} /> : null}
              </div>
              {message.error ? (
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-error/20 pt-4 text-[11px]">
                  {onRetry && <button type="button" onClick={() => onRetry(message)} className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-error/50 px-3 text-error transition-colors hover:bg-error/10"><RefreshCw size={13} /> {text.chat.retry}</button>}
                  {message.retryAfterSeconds && message.retryAfterSeconds > 0 && <RetryCountdown seconds={message.retryAfterSeconds} label={text.chat.retryIn} />}
                  {message.requestId && onCopyRequestId && <button type="button" onClick={() => onCopyRequestId(message)} className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-error transition-colors hover:bg-error/10"><Copy size={13} /> {text.chat.copyRequestId}</button>}
                  <button type="button" onClick={() => router.push("/playground")} className="min-h-9 rounded-full px-3 text-error transition-colors hover:bg-error/10">{text.chat.newDialog}</button>
                </div>
              ) : message.content ? (
                <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-outline-variant pt-4 text-[11px] text-on-secondary-container">
                  <button type="button" onClick={() => onCopy(message)} className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-2.5 py-1.5 transition-colors hover:bg-surface-container-low hover:text-primary">
                    {copiedMessageId === message.id ? <Check size={13} /> : <Copy size={13} />}
                    {copiedMessageId === message.id ? text.chat.copied : text.chat.copy}
                  </button>
                  <button type="button" onClick={() => onSpeak(message)} aria-pressed={speakingMessageId === message.id} className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-2.5 py-1.5 transition-colors hover:bg-surface-container-low hover:text-primary">
                    <Volume2 size={13} />
                    {speakingMessageId === message.id ? text.chat.stopSpeaking : text.chat.speak}
                  </button>
                  {message.requestId && onCopyRequestId && <button type="button" onClick={() => onCopyRequestId(message)} className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-2.5 py-1.5 transition-colors hover:bg-surface-container-low hover:text-primary"><Copy size={13} /> {text.chat.copyRequestId}</button>}
                  {message.meta?.fallbackReason && <span className="basis-full text-error">{text.chat.fallbackNotice}</span>}
                  {message.meta?.actualModel && <span className="basis-full text-on-secondary-container">{text.chat.usedModel}: {message.meta.actualModel} · {Math.max(0, Math.round(message.meta.latencyMs))}ms</span>}
                  {message.meta?.reasoningUsed && <span className="basis-full text-on-secondary-container">{text.chat.reasoningUsed}</span>}
                  {speechNotice && message.id === lastMessage?.id && <span className="text-error">{speechNotice}</span>}
                </div>
              ) : null}
            </div>
          </article>
        ),
      )}
      <div className="sr-only" aria-live="polite" aria-atomic="true">{isPending ? text.chat.generating : ""}</div>
    </div>
  );
}
