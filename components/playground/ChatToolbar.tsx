import { Sparkles } from "lucide-react";

import { DataRouteInspector } from "@/components/playground/DataRouteInspector";
import type { ChatResponseMode } from "@/lib/chat-modes";
import type { ChatDictionary } from "@/lib/chat-i18n";
import type { Locale } from "@/lib/i18n";

type SuggestionKind = "learn" | "write";
type Tone = "professional" | "character" | "erma";

type ChatToolbarProps = {
  text: ChatDictionary;
  locale: Locale;
  responseMode: ChatResponseMode;
  suggestionKind: SuggestionKind | null;
  reasonEnabled: boolean;
  tone: Tone;
  onResponseMode: (mode: ChatResponseMode) => void;
  onSuggestion: (kind: SuggestionKind) => void;
  onReason: () => void;
  onTone: () => void;
};

export function ChatToolbar({ locale }: ChatToolbarProps) {
  const ru = locale === "ru";
  return (
    <div className="mx-auto mb-2 hidden w-full max-w-[780px] sm:block" data-chat-automatic-routing>
      <div className="rounded-2xl border border-outline-variant/70 bg-surface-container-low px-3 py-2 text-[11px] leading-5 text-on-secondary-container">
        <p className="flex items-start gap-2"><Sparkles size={14} className="mt-0.5 shrink-0" /><span>{ru ? "Erma сама выбирает глубину ответа и нужные инструменты по вашему запросу." : "Erma automatically chooses the right depth and tools for your request."}</span></p>
        <div className="mt-1"><DataRouteInspector locale={locale} compact /></div>
      </div>
    </div>
  );
}
