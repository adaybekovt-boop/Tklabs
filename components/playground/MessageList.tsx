"use client";

import { Check, Copy, Volume2 } from "lucide-react";

import AIThinkingBlock from "@/components/ui/ai-thinking-block";
import type { AiResponseMeta } from "@/lib/ai/types";
import { getDictionary, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  error?: boolean;
  meta?: AiResponseMeta;
};

type ChatDictionary = ReturnType<typeof getDictionary>;

function providerLabel(meta: AiResponseMeta, text: ChatDictionary) {
  return meta.actualProvider === "nvidia"
    ? text.chat.providerNvidia
    : meta.actualProvider === "clodex"
      ? text.chat.providerClodex
      : text.chat.providerFallback;
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
            <div className="max-w-[92%] border border-outline-variant bg-surface-container-low px-5 py-4 sm:max-w-[82%] sm:px-6">
              <p className="whitespace-pre-wrap text-[15px] leading-[1.7] text-primary">{message.content}</p>
            </div>
          </article>
        ) : (
          <article key={message.id} className="chat-message-enter flex justify-start">
            <div className={cn("max-w-[96%] border-l-2 py-3 pl-5 sm:max-w-[92%] sm:pl-6", message.error ? "border-error" : "border-primary")}>
              <div className={cn("whitespace-pre-wrap text-[15px] leading-[1.75]", message.error ? "text-error" : "text-primary")}>
                {message.content || (isPending && message.id === lastMessage?.id ? <AIThinkingBlock label={text.chat.thinking} /> : null)}
              </div>
              {message.content && !message.error && (
                <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-outline-variant pt-3 text-[11px] text-on-secondary-container">
                  <button type="button" onClick={() => onCopy(message)} className="flex items-center gap-1.5 transition-colors hover:text-primary">
                    {copiedMessageId === message.id ? <Check size={13} /> : <Copy size={13} />}
                    {copiedMessageId === message.id ? text.chat.copied : text.chat.copy}
                  </button>
                  <button type="button" onClick={() => onSpeak(message)} aria-pressed={speakingMessageId === message.id} className="flex items-center gap-1.5 transition-colors hover:text-primary">
                    <Volume2 size={13} />
                    {speakingMessageId === message.id ? text.chat.stopSpeaking : text.chat.speak}
                  </button>
                  {message.meta && (
                    <span className="min-w-0 max-w-full break-words text-on-secondary-container">
                      {providerLabel(message.meta, text)}
                      {message.meta.actualProvider !== "edge-fallback" && ` · ${message.meta.actualModel}`}
                      {` · ${message.meta.latencyMs} ms`}
                    </span>
                  )}
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
