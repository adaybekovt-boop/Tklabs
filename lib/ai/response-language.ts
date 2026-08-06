export type ResponseLanguage = "ru" | "en";

const EXPLICIT_LANGUAGE_PATTERNS: Array<{ language: ResponseLanguage; pattern: RegExp }> = [
  {
    language: "ru",
    pattern: /(?:ответ(?:ь|ьте)|отвечай|пиши|напиши|говори|объясни|переведи|продолжай)[^.!?\n]{0,48}(?:на\s+)?русск(?:ом|ий|ого|ую)?/giu,
  },
  {
    language: "ru",
    pattern: /(?:answer|reply|write|explain|translate|continue)[^.!?\n]{0,48}(?:in\s+)?russian/giu,
  },
  {
    language: "en",
    pattern: /(?:ответ(?:ь|ьте)|отвечай|пиши|напиши|говори|объясни|переведи|продолжай)[^.!?\n]{0,48}(?:на\s+)?английск(?:ом|ий|ого|ую)?/giu,
  },
  {
    language: "en",
    pattern: /(?:answer|reply|write|explain|translate|continue)[^.!?\n]{0,48}(?:in\s+)?english/giu,
  },
];

function explicitResponseLanguage(prompt: string): ResponseLanguage | null {
  let selected: { language: ResponseLanguage; index: number } | null = null;
  for (const { language, pattern } of EXPLICIT_LANGUAGE_PATTERNS) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(prompt)) !== null) {
      if (!selected || match.index >= selected.index) selected = { language, index: match.index };
      if (match[0].length === 0) pattern.lastIndex += 1;
    }
  }
  return selected?.language ?? null;
}

function naturalLanguageText(prompt: string) {
  return prompt
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g, " ")
    .replace(/\b(?:[A-Fa-f0-9]{16,}|[A-Za-z0-9_-]{32,})\b/g, " ");
}

export function inferResponseLanguage(prompt: string, interfaceLocale: ResponseLanguage): ResponseLanguage {
  const explicit = explicitResponseLanguage(prompt);
  if (explicit) return explicit;

  const text = naturalLanguageText(prompt);
  const cyrillicLetters = text.match(/[А-Яа-яЁё]/g)?.length ?? 0;
  const latinLetters = text.match(/[A-Za-z]/g)?.length ?? 0;
  const words = text.split(/\s+/).filter(Boolean);
  const cyrillicWords = words.filter((word) => /[А-Яа-яЁё]/.test(word)).length;
  const latinWords = words.filter((word) => /[A-Za-z]/.test(word)).length;

  if (cyrillicLetters >= 3) {
    if (cyrillicWords >= latinWords) return "ru";
    if (cyrillicLetters >= latinLetters * 0.3) return "ru";
  }

  if (latinLetters >= 3) {
    if (latinWords > cyrillicWords) return "en";
    if (latinLetters >= cyrillicLetters * 1.5) return "en";
  }

  if (cyrillicLetters > latinLetters) return "ru";
  if (latinLetters > cyrillicLetters) return "en";
  return interfaceLocale;
}

export function responseLanguageInstruction(language: ResponseLanguage) {
  return language === "ru"
    ? "Текущий запрос пользователя определён как русскоязычный. Ответь полностью на русском языке. Английские названия API, моделей, команд и кода оставляй без искусственного перевода. Не переходи на английский без прямой просьбы пользователя."
    : "The current user request is detected as English. Reply fully in English. Preserve code, API names, model names, and commands exactly. Do not switch to another language unless the user explicitly asks for it.";
}
