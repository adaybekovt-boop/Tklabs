export type ResponseLanguage = "ru" | "en" | "same-as-request";
export type InterfaceLocale = "ru" | "en";

const EXPLICIT_LANGUAGE_PATTERNS: Array<{ language: Exclude<ResponseLanguage, "same-as-request">; pattern: RegExp }> = [
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

const RUSSIAN_WORDS = new Set([
  "а", "без", "будет", "бы", "в", "вы", "где", "да", "для", "до", "его", "её", "если", "есть", "ещё", "и", "из", "или", "исправь", "как", "когда", "кратко", "мне", "можно", "мы", "на", "надо", "напиши", "не", "но", "нужно", "объясни", "он", "она", "они", "ответь", "перескажи", "по", "почему", "пожалуйста", "помоги", "посмотри", "привет", "про", "с", "сделай", "так", "там", "ты", "у", "что", "это", "я",
]);

const ENGLISH_WORDS = new Set([
  "a", "about", "and", "answer", "are", "can", "do", "explain", "fix", "for", "from", "help", "how", "i", "in", "is", "it", "me", "of", "on", "please", "reply", "the", "this", "to", "what", "when", "why", "with", "write", "you",
]);

const NON_RUSSIAN_CYRILLIC = /[ӘҒҚҢӨҰҮҺІЇЄҐЎЈЉЊЂЋЏ]/iu;

function currentUserRequest(prompt: string) {
  return prompt.split(/\n\nAttached text files:\n/i, 1)[0] ?? prompt;
}

function explicitResponseLanguage(prompt: string): "ru" | "en" | null {
  let selected: { language: "ru" | "en"; index: number } | null = null;
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

function normalizedWords(text: string) {
  return text.toLocaleLowerCase().match(/[\p{L}]+/gu) ?? [];
}

function dictionaryScore(words: string[], dictionary: Set<string>) {
  return words.reduce((score, word) => score + (dictionary.has(word) ? 1 : 0), 0);
}

export function inferResponseLanguage(prompt: string, interfaceLocale: InterfaceLocale): ResponseLanguage {
  const request = currentUserRequest(prompt);
  const explicit = explicitResponseLanguage(request);
  if (explicit) return explicit;

  const text = naturalLanguageText(request);
  const letters = text.match(/\p{L}/gu)?.length ?? 0;
  if (letters === 0) return interfaceLocale;

  const words = normalizedWords(text);
  const cyrillicLetters = text.match(/\p{Script=Cyrillic}/gu)?.length ?? 0;
  const latinLetters = text.match(/\p{Script=Latin}/gu)?.length ?? 0;
  const russianScore = dictionaryScore(words, RUSSIAN_WORDS);
  const englishScore = dictionaryScore(words, ENGLISH_WORDS);

  if (cyrillicLetters > 0) {
    if (NON_RUSSIAN_CYRILLIC.test(text)) return "same-as-request";
    if (/[ЁёЪъЫыЭэ]/u.test(text) || russianScore >= 1) return "ru";
    return "same-as-request";
  }

  if (latinLetters > 0) {
    if (englishScore >= 2 || (words.length <= 3 && englishScore >= 1)) return "en";
    return "same-as-request";
  }

  return "same-as-request";
}

export function responseLanguageInstruction(language: ResponseLanguage) {
  if (language === "ru") {
    return "Текущий запрос пользователя определён как русскоязычный. Ответь полностью на русском языке. Английские названия API, моделей, команд и кода оставляй без искусственного перевода. Не переходи на английский без прямой просьбы пользователя.";
  }
  if (language === "en") {
    return "The current user request is detected as English. Reply fully in English. Preserve code, API names, model names, and commands exactly. Do not switch to another language unless the user explicitly asks for it.";
  }
  return "Reply in the same natural language as the current user request, regardless of the interface locale. If the user explicitly asks for another response language, use that requested language. Preserve code, API names, model names, and commands exactly.";
}
