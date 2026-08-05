import { BookOpen, PenLine } from "lucide-react";

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
    <div className="mx-auto mb-4 flex max-w-[780px] gap-3 overflow-x-auto px-1 pb-1 md:flex-wrap md:overflow-visible md:px-0 md:pb-0">
      <button type="button" onClick={() => onSuggestion("learn")} className={cn("label-caps flex shrink-0 items-center gap-2 border border-outline-variant px-3 py-2.5 transition-colors hover:border-primary", suggestionKind === "learn" && "border-primary bg-surface-container-low")}>
        <BookOpen size={13} /> {text.chat.learn}
      </button>
      <button type="button" onClick={() => onSuggestion("write")} className={cn("label-caps flex shrink-0 items-center gap-2 border border-outline-variant px-3 py-2.5 transition-colors hover:border-primary", suggestionKind === "write" && "border-primary bg-surface-container-low")}>
        <PenLine size={13} /> {text.chat.write}
      </button>
      <button type="button" onClick={onReason} className={cn("label-caps shrink-0 border border-outline-variant px-3 py-2.5 transition-colors hover:border-primary", reasonEnabled && "border-primary bg-surface-container-low")} aria-pressed={reasonEnabled}>
        {reasonEnabled ? text.chat.reasoningOn : text.chat.reasoningOff}
      </button>
      <button type="button" onClick={onTone} className={cn("label-caps shrink-0 border border-outline-variant px-3 py-2.5 transition-colors hover:border-primary", tone !== "professional" && "border-primary bg-surface-container-low")} aria-pressed={tone !== "professional"}>
        {tone === "professional" ? text.chat.toneProfessional : tone === "character" ? text.chat.toneCharacter : text.chat.toneErma}
      </button>
    </div>
  );
}
