import { BookOpen, ChevronDown, PenLine, SlidersHorizontal } from "lucide-react";

import { CHAT_RESPONSE_MODES, chatResponseModeLabel, type ChatResponseMode } from "@/lib/chat-modes";
import { getDictionary, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type SuggestionKind = "learn" | "write";
type Tone = "professional" | "character" | "erma";

export function ChatToolbar({
  text,
  locale,
  responseMode,
  suggestionKind,
  reasonEnabled,
  tone,
  onResponseMode,
  onSuggestion,
  onReason,
  onTone,
}: {
  text: ReturnType<typeof getDictionary>;
  locale: Locale;
  responseMode: ChatResponseMode;
  suggestionKind: SuggestionKind | null;
  reasonEnabled: boolean;
  tone: Tone;
  onResponseMode: (mode: ChatResponseMode) => void;
  onSuggestion: (kind: SuggestionKind) => void;
  onReason: () => void;
  onTone: () => void;
}) {
  return (
    <div className="mx-auto mb-2 hidden w-full max-w-[780px] sm:block" data-chat-quick-modes>
      <div className="mb-2 flex gap-1 overflow-x-auto rounded-2xl border border-outline-variant bg-surface-container-lowest p-1.5">
        {CHAT_RESPONSE_MODES.map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => onResponseMode(mode)}
            aria-pressed={responseMode === mode}
            className={cn(
              "min-h-9 shrink-0 rounded-xl px-3 text-[11px] font-medium text-on-secondary-container transition-colors hover:bg-surface-container-low hover:text-primary",
              responseMode === mode && "bg-primary text-on-primary hover:bg-primary hover:text-on-primary",
            )}
          >
            {chatResponseModeLabel(mode, locale)}
          </button>
        ))}
      </div>

      <details className="group">
        <summary className="flex min-h-9 cursor-pointer list-none items-center justify-between rounded-xl px-2 text-[11px] font-medium text-on-secondary-container hover:bg-surface-container-low hover:text-primary [&::-webkit-details-marker]:hidden">
          <span className="flex items-center gap-2"><SlidersHorizontal size={14} />{text.chat.input.model} · {text.chat.input.effort}</span>
          <ChevronDown size={14} className="transition-transform group-open:rotate-180" />
        </summary>
        <div className="mt-2 flex gap-2 overflow-x-auto rounded-2xl border border-outline-variant bg-surface-container-lowest p-2 md:flex-wrap">
          <button type="button" onClick={() => onSuggestion("learn")} className={cn("flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-3 text-[12px] text-on-secondary-container hover:bg-surface-container-low hover:text-primary", suggestionKind === "learn" && "bg-surface-container-low text-primary")}><BookOpen size={14} /> {text.chat.learn}</button>
          <button type="button" onClick={() => onSuggestion("write")} className={cn("flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-3 text-[12px] text-on-secondary-container hover:bg-surface-container-low hover:text-primary", suggestionKind === "write" && "bg-surface-container-low text-primary")}><PenLine size={14} /> {text.chat.write}</button>
          <button type="button" onClick={onReason} className={cn("min-h-10 shrink-0 rounded-xl px-3 text-[12px] text-on-secondary-container hover:bg-surface-container-low hover:text-primary", reasonEnabled && "bg-surface-container-low text-primary")} aria-pressed={reasonEnabled}>{reasonEnabled ? text.chat.reasoningOn : text.chat.reasoningOff}</button>
          <button type="button" onClick={onTone} className={cn("min-h-10 shrink-0 rounded-xl px-3 text-[12px] text-on-secondary-container hover:bg-surface-container-low hover:text-primary", tone !== "professional" && "bg-surface-container-low text-primary")} aria-pressed={tone !== "professional"}>{tone === "professional" ? text.chat.toneProfessional : tone === "character" ? text.chat.toneCharacter : text.chat.toneErma}</button>
        </div>
      </details>
    </div>
  );
}
