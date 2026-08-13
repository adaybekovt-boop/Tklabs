import type { ChatDictionary } from "@/lib/chat-i18n";

type SuggestionKind = "learn" | "write";

export function SuggestionPanel({
  text,
  kind,
  onClose,
  onChoose,
}: {
  text: ChatDictionary;
  kind: SuggestionKind;
  onClose: () => void;
  onChoose: (suggestion: string) => void;
}) {
  return (
    <div className="mx-auto mb-4 max-w-[780px] border border-outline-variant bg-surface-container-low p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="label-caps text-on-secondary-container">{kind === "learn" ? text.chat.suggestionLearn : text.chat.suggestionWrite}</span>
        <button type="button" onClick={onClose} className="text-[11px] text-on-secondary-container hover:text-primary">{text.chat.close}</button>
      </div>
      <div className="grid gap-2 md:grid-cols-3">
        {text.chat.suggestions[kind].map((suggestion) => (
          <button key={suggestion} type="button" onClick={() => onChoose(suggestion)} className="border border-outline-variant bg-white px-3 py-3 text-left text-[12px] leading-[1.4] transition-colors hover:border-primary">
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}
