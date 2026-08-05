"use client";

import { Check, Copy, Volume2 } from "lucide-react";

import AIThinkingBlock from "@/components/ui/ai-thinking-block";
import { ReasoningTrace } from "@/components/ui/reasoning-trace";
import type { AiResponseMeta } from "@/lib/ai/types";
import { getDictionary, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  thinking?: string;
  error?: boolean;
  meta?: AiResponseMeta;
};

type ChatDictionary = ReturnType<typeof getDictionary>;

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
}) {
  const lastMessage = messages[messages.length - 1];
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-12 pb-10 md:gap-10 md:pb-8" aria-live="polite" lang={locale}>
      {messages.map((message) =>
        message.role === "user" ? (
          <article key={message.id} className="chat-message-enter flex justify-end">
            <div className="max-w-[92%] rounded-3xl border border-outline-variant bg-surface-container-low px-5 py-4 shadow-[0_14px_40px_color-mix(in_srgb,var(--color-primary)_5%,transparent)] sm:max-w-[82%] sm:px-6">
              <p className="whitespace-pre-wrap text-[15px] leading-[1.7] text-primary">{message.content}</p>
            </div>
          </article>
        ) : (
          <article key={message.id} className="chat-message-enter flex justify-start">
            <div className={cn("assistant-message-card max-w-[96%] rounded-3xl border bg-surface-container-lowest px-5 py-5 shadow-[0_16px_48px_color-mix(in_srgb,var(--color-primary)_5%,transparent)] sm:max-w-[92%] sm:px-6", message.error ? "border-error/60" : "border-outline-variant")}>
              <div className="mb-4 flex items-center gap-3">
                <span className="grid size-8 place-items-center overflow-hidden rounded-xl border border-outline-variant bg-surface-container-low p-1.5">
                  <img src="/images/models/model-mark.png" alt="" className="size-full object-contain" />
                </span>
                <span className="label-caps text-on-secondary-container">TK LABS AI</span>
              </div>
              {message.thinking && (
                <ReasoningTrace thinking={message.thinking} label={text.chat.reasoningLabel} showLabel={text.chat.reasoningShow} hideLabel={text.chat.reasoningHide} />
              )}
              <div className={cn("whitespace-pre-wrap text-[15px] leading-[1.75]", message.error ? "text-error" : "text-primary")}>
                {message.content || (isPending && message.id === lastMessage?.id ? <AIThinkingBlock label={text.chat.thinking} /> : null)}
              </div>
              {message.content && !message.error && (
                <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-outline-variant pt-4 text-[11px] text-on-secondary-container">
                  <button type="button" onClick={() => onCopy(message)} className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 transition-colors hover:bg-surface-container-low hover:text-primary">
                    {copiedMessageId === message.id ? <Check size={13} /> : <Copy size={13} />}
                    {copiedMessageId === message.id ? text.chat.copied : text.chat.copy}
                  </button>
                  <button type="button" onClick={() => onSpeak(message)} aria-pressed={speakingMessageId === message.id} className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 transition-colors hover:bg-surface-container-low hover:text-primary">
                    <Volume2 size={13} />
                    {speakingMessageId === message.id ? text.chat.stopSpeaking : text.chat.speak}
                  </button>
                  {message.meta?.fallbackReason && <span className="basis-full text-error">{text.chat.fallbackNotice}</span>}
                  {speechNotice && message.id === lastMessage?.id && <span className="text-error">{speechNotice}</span>}
                </div>
              )}
            </div>
          </article>
        ),
      )}
    </div>
  );
}
