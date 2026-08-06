export type ChatResponseMode = "normal" | "analysis" | "code" | "search" | "document";

export const CHAT_RESPONSE_MODES: ChatResponseMode[] = ["normal", "analysis", "code", "search", "document"];

export function chatResponseModeLabel(mode: ChatResponseMode, locale: "ru" | "en") {
  const labels: Record<ChatResponseMode, { ru: string; en: string }> = {
    normal: { ru: "Обычный ответ", en: "Standard" },
    analysis: { ru: "Анализ", en: "Analysis" },
    code: { ru: "Код", en: "Code" },
    search: { ru: "Поиск", en: "Search" },
    document: { ru: "Документ", en: "Document" },
  };
  return labels[mode][locale];
}

export function chatResponseModeInstruction(mode: ChatResponseMode, locale: "ru" | "en") {
  const language = locale === "ru" ? "Russian" : "English";
  switch (mode) {
    case "analysis":
      return `Use analysis mode. Give a structured, evidence-aware answer in ${language}. State assumptions and separate conclusions from supporting points.`;
    case "code":
      return `Use code mode. Prioritize correct, runnable code, concise explanations, edge cases, and verification steps. Reply in ${language} unless code syntax requires otherwise.`;
    case "search":
      return `Use search mode. Organize the answer like a research brief, distinguish verified facts from uncertainty, and name the sources that would be required. Do not invent browsing or citations. Reply in ${language}.`;
    case "document":
      return `Use document mode. Treat the request as document work: preserve structure, terminology, headings, and requested formatting. Reply in ${language}.`;
    default:
      return `Use standard answer mode. Be direct, complete, and reply in ${language}.`;
  }
}
