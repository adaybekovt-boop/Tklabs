"use client";

import { useMemo, useState } from "react";
import { Eye, X } from "lucide-react";

import type { ChatMessage } from "@/components/playground/MessageList";
import { detectAttentionInsight } from "@/lib/ai/attention";
import type { Locale } from "@/lib/i18n";

export function ErmaAttentionNotice({ messages, locale }: { messages: ChatMessage[]; locale: Locale }) {
  const [dismissedId, setDismissedId] = useState<string | null>(null);
  const insight = useMemo(() => detectAttentionInsight(messages.map((message) => ({ role: message.role, content: message.content }))), [messages]);
  if (!insight || insight.id === dismissedId) return null;
  const ru = locale === "ru";
  const translatedTitle = ru ? insight.title : insight.kind === "repeated-topic" ? "Recurring topic" : insight.kind === "open-loop" ? "Open loop" : "Decision may have changed";
  const translatedDetail = ru ? insight.detail : insight.kind === "repeated-topic"
    ? "This topic has appeared earlier in the conversation. It may be useful to turn the next response into a decision or concrete next step."
    : insight.kind === "open-loop"
      ? "An earlier user message left something to revisit. Erma is surfacing it without creating a task or sending extra data."
      : "Two related decision statements appear in the conversation. Consider keeping the current one and explicitly retiring the old one.";

  return (
    <aside className="mx-auto mb-4 flex w-full max-w-3xl gap-3 border border-outline-variant/50 bg-surface-container-low px-4 py-3" aria-label={ru ? "Erma заметила" : "Erma noticed"}>
      <div className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-primary text-on-primary"><Eye size={15} /></div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-secondary">ERMA ATTENTION · {Math.round(insight.confidence * 100)}%</p><p className="mt-1 text-sm font-semibold text-primary">{translatedTitle}</p></div>
          <button type="button" onClick={() => setDismissedId(insight.id)} className="grid size-8 shrink-0 place-items-center rounded-full text-on-surface-variant hover:bg-surface-container hover:text-primary" aria-label={ru ? "Скрыть наблюдение" : "Dismiss observation"}><X size={14} /></button>
        </div>
        <p className="mt-2 text-xs leading-5 text-on-surface-variant">{translatedDetail}</p>
        <p className="mt-2 text-[10px] leading-4 text-on-surface-variant">{ru ? "Подмечено локально по сообщениям этой сессии. Дополнительный AI-вызов не выполнялся." : "Detected locally from this session. No additional AI call was made."}</p>
      </div>
    </aside>
  );
}
