import { BookOpen, ChevronDown, PenLine, SlidersHorizontal } from "lucide-react";

import { getDictionary } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type SuggestionKind = "learn" | "write";
type Tone = "professional" | "character" | "erma";

export function ChatToolbar({
  text,
  suggestionKind,
  reasonEnabled,
  tone,
  onSuggestion,
  onReason,
  onTone,
}: {
  text: ReturnType<typeof getDictionary>;
  suggestionKind: SuggestionKind | null;
  reasonEnabled: boolean;
  tone: Tone;
  onSuggestion: (kind: SuggestionKind) => void;
  onReason: () => void;
  onTone: () => void;
}) {
  return (
    <details className="group mx-auto mb-2 w-full max-w-[780px]">
      <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between rounded-xl px-2 text-[12px] font-medium text-on-secondary-container hover:bg-surface-container-low hover:text-primary [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2">
          <SlidersHorizontal size={15} />
          {text.chat.input.model} · {text.chat.input.effort}
        </span>
        <ChevronDown size={14} className="transition-transform group-open:rotate-180" />
      </summary>
      <div className="mt-2 flex gap-2 overflow-x-auto rounded-2xl border border-outline-variant bg-surface-container-lowest p-2 md:flex-wrap">
        <button
          type="button"
          onClick={() => onSuggestion("learn")}
          className={cn(
            "flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-3 text-[12px] text-on-secondary-container hover:bg-surface-container-low hover:text-primary",
            suggestionKind === "learn" && "bg-surface-container-low text-primary",
          )}
        >
          <BookOpen size={14} /> {text.chat.learn}
        </button>
        <button
          type="button"
          onClick={() => onSuggestion("write")}
          className={cn(
            "flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-3 text-[12px] text-on-secondary-container hover:bg-surface-container-low hover:text-primary",
            suggestionKind === "write" && "bg-surface-container-low text-primary",
          )}
        >
          <PenLine size={14} /> {text.chat.write}
        </button>
        <button
          type="button"
          onClick={onReason}
          className={cn(
            "min-h-10 shrink-0 rounded-xl px-3 text-[12px] text-on-secondary-container hover:bg-surface-container-low hover:text-primary",
            reasonEnabled && "bg-surface-container-low text-primary",
          )}
          aria-pressed={reasonEnabled}
        >
          {reasonEnabled ? text.chat.reasoningOn : text.chat.reasoningOff}
        </button>
        <button
          type="button"
          onClick={onTone}
          className={cn(
            "min-h-10 shrink-0 rounded-xl px-3 text-[12px] text-on-secondary-container hover:bg-surface-container-low hover:text-primary",
            tone !== "professional" && "bg-surface-container-low text-primary",
          )}
          aria-pressed={tone !== "professional"}
        >
          {tone === "professional" ? text.chat.toneProfessional : tone === "character" ? text.chat.toneCharacter : text.chat.toneErma}
        </button>
      </div>
    </details>
  );
}
