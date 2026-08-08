export type GroundingLanguage = "ru" | "en";

const KAZAKHSTAN_CONTEXT = /(?:казахстан|қазақстан|kazakhstan|kazakh|қазақ|казах|жуз|жүз|zhuz|ұлы\s+жүз|орта\s+жүз|кіші\s+жүз|улы\s+жуз|старш(?:ий|его)\s+жуз|средн(?:ий|его)\s+жуз|младш(?:ий|его)\s+жуз|аким|әкім|тенге|теңге|ұбт|ент(?=\s|[?!.:,;]|$)|абылай|т[өо]ле\s+би|tole\s+bi|қазыбек|әйтеке|абай|құнанбай|кунанбай|шоқан|шокан|уәлиханов|валиханов|ыбырай|алтынсарин|әл[-\s]?фараби|аль[-\s]?фараби|бауыржан|момышұлы|момышулы|қонаев|конаев|алаш|бөкейхан|бокейхан|жеті\s+жарғы|жеты\s+жаргы|ясауи|яcауи|туркестан|байконур|чарын|медеу|хан[-\s]?тенгри|айтыс|алматы|астан[аы]|шымкент)/iu;
const EXACT_FACT_FORM = /^(?:кто|что|где|когда|как|какой|какая|какое|какие|какого|каков|какова|каковы|почему|сколько|назови|перечисли|кім|не|қайда|қашан|қалай|қандай|қанша|неге|who|what|where|when|how|which|why|list|name)(?=\s|[?!.:,;]|$)/iu;
const KAZAKH_QUESTION_WORD = /(?:^|\s)(?:кім|не|қайда|қашан|қалай|қандай|қанша|неге)(?=\s|[?!.:,;]|$)/iu;
const LIST_FACT = /(?:кто\s+входит|что\s+входит|какие\s+(?:плем|род|стран|област|район|вид|тип|член|участ)|перечисли|состав|список|входит\s+в|қандай\s+(?:тайпа|ру|облыс|аудан)|кіреді|members?|consists?\s+of|list\s+(?:the|all))/iu;
const DATE_NUMBER_FACT = /(?:\b\d{3,4}\b|дата|год|численност|населени|процент|ставк|курс|сколько|халық\s+саны|мөлшерлем|бағам|қанша|how\s+many|population|rate|percent|date|year)/iu;
const AUTHORITY_SENSITIVE = /(?:закон|статья|кодекс|правил|постановлен|указ|налог|статист|населени|базов[\p{L}\p{M}]*\s+ставк|нацбанк|национальн[\p{L}\p{M}]*\s+банк[\p{L}\p{M}]*|министр|президент|премьер|аким|заң|кодекс|ұлттық\s+банк|базалық\s+мөлшерлем|халық\s+саны|министр|президент|әкім|official|law|statistic|population|minister|president|prime\s+minister|central\s+bank)/iu;
const HISTORICAL_OR_GEOGRAPHIC = /(?:истори|ханств|хан(?=\s|[?!.:,;]|$)|би(?=\s|[?!.:,;]|$)|батыр|жуз|жүз|zhuz|плем|род(?=\s|[?!.:,;]|$)|географ|област|район|столиц|тарих|хандық[\p{L}\p{M}]*|хандығ[\p{L}\p{M}]*|тайпа|ру(?=\s|[?!.:,;]|$)|облыс|аудан|астана|history|historical|tribe|clan|region|capital)/iu;
const CURRENT_FACT = /(?:^|\s)(?:сейчас|сегодня|текущ[\p{L}\p{M}]*|последн[\p{L}\p{M}]*|қазір|қазіргі|бүгін|current|latest|today|now)(?=\s|[?!.:,;]|$)/iu;
const CREATIVE_OR_PERSONAL = /(?:придумай|напиши\s+(?:стих|рассказ)|иде[яи]|помоги\s+решить|как\s+мне|что\s+мне\s+делать|посоветуй|create|brainstorm|write\s+(?:a\s+)?(?:poem|story)|what\s+should\s+i\s+do|advice)/iu;
const NAMED_ENTITY_HINT = /\s[\p{Lu}][\p{L}\p{M}'’\-]{2,}/u;
const SECRETISH = /\b(?:sk|nvapi|ghp|github_pat|xox[baprs]|AIza)[-_A-Za-z0-9]{12,}\b/g;
const LONG_TOKEN = /\b[A-Za-z0-9_-]{32,}\b/g;
const EMAIL = /\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g;
const PHONE = /(?<!\w)(?:\+?\d[\d\s().-]{8,}\d)(?!\w)/g;
const ATTACHMENT_MARKER = /\n\nAttached text files:[\s\S]*$/i;

const KZ_ENTITY_ALIASES: Array<{ pattern: RegExp; canonical: string; ru: string; kk: string; en: string }> = [
  { pattern: /(?:старш(?:ий|его)\s+жуз|ұлы\s+жүз|улы\s+жуз|uly\s+zhuz|senior\s+zhuz|great\s+zhuz)/iu, canonical: "Ұлы жүз", ru: "Старший жуз", kk: "Ұлы жүз", en: "Uly Zhuz" },
  { pattern: /(?:средн(?:ий|его)\s+жуз|орта\s+жүз|orta\s+zhuz|middle\s+zhuz)/iu, canonical: "Орта жүз", ru: "Средний жуз", kk: "Орта жүз", en: "Orta Zhuz" },
  { pattern: /(?:младш(?:ий|его)\s+жуз|кіші\s+жүз|киши\s+жуз|kishi\s+zhuz|junior\s+zhuz|lesser\s+zhuz)/iu, canonical: "Кіші жүз", ru: "Младший жуз", kk: "Кіші жүз", en: "Kishi Zhuz" },
];

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.replace(/\s+/g, " ").trim()).filter(Boolean))];
}

export function sanitizeSearchQuery(value: string) {
  return value
    .replace(ATTACHMENT_MARKER, "")
    .replace(EMAIL, " ")
    .replace(PHONE, " ")
    .replace(SECRETISH, " ")
    .replace(LONG_TOKEN, " ")
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 360);
}

export function isKazakhstanContext(value: string) {
  return KAZAKHSTAN_CONTEXT.test(value);
}

export function factualRiskScore(value: string) {
  const query = sanitizeSearchQuery(value);
  if (!query || CREATIVE_OR_PERSONAL.test(query)) return 0;
  const exact = EXACT_FACT_FORM.test(query);
  let score = 0;
  if (exact) score += 1;
  if (KAZAKH_QUESTION_WORD.test(query)) score += 1;
  if (exact && NAMED_ENTITY_HINT.test(query)) score += 2;
  if (LIST_FACT.test(query)) score += 2;
  if (DATE_NUMBER_FACT.test(query)) score += 1;
  if (AUTHORITY_SENSITIVE.test(query)) score += 2;
  if (HISTORICAL_OR_GEOGRAPHIC.test(query)) score += 1;
  if (isKazakhstanContext(query)) score += 2;
  if (CURRENT_FACT.test(query)) score += 2;
  return score;
}

export function shouldGroundExactFact(value: string) {
  return factualRiskScore(value) >= 3;
}

function entityVariants(query: string) {
  for (const alias of KZ_ENTITY_ALIASES) {
    if (!alias.pattern.test(query)) continue;
    return {
      canonical: alias.canonical,
      ru: `${alias.ru} Казахстан состав племена роды`,
      kk: `${alias.kk} Қазақстан тайпалары құрамы`,
      en: `${alias.en} Kazakhstan tribes composition`,
    };
  }
  return null;
}

function officialQuery(query: string) {
  if (!isKazakhstanContext(query)) return "";
  if (/(?:закон|статья|кодекс|правил|постановлен|указ|заң|law)/iu.test(query)) return `${query} site:adilet.zan.kz`;
  if (/(?:статист|населени|халық\s+саны|population|statistic)/iu.test(query)) return `${query} site:stat.gov.kz`;
  if (/(?:нацбанк|национальн[\p{L}\p{M}]*\s+банк|ұлттық\s+банк|базов[\p{L}\p{M}]*\s+ставк|базалық\s+мөлшерлем|курс|бағам|тенге|теңге|central\s+bank)/iu.test(query)) return `${query} site:nationalbank.kz`;
  if (/(?:президент|акорд|president)/iu.test(query)) return `${query} site:akorda.kz`;
  if (HISTORICAL_OR_GEOGRAPHIC.test(query)) return `${query} site:e-history.kz`;
  return `${query} site:gov.kz`;
}

export function buildGroundedSearchQueries(value: string, language: GroundingLanguage) {
  const query = sanitizeSearchQuery(value);
  if (!query) return [];
  const queries = [query];
  const entity = entityVariants(query);
  if (entity) {
    queries.push(language === "ru" ? entity.kk : entity.en);
    queries.push(language === "ru" ? entity.ru : entity.kk);
  } else {
    const official = officialQuery(query);
    if (official) queries.push(official);
  }
  return unique(queries).slice(0, 3);
}

function hostOf(url: string) {
  try { return new URL(url).hostname.toLowerCase().replace(/^www\./, ""); } catch { return ""; }
}

export function sourceAuthorityScore(url: string, query: string) {
  const host = hostOf(url);
  if (!host) return -100;
  let score = url.startsWith("https://") ? 1 : 0;
  if (host.endsWith(".gov") || host.endsWith(".gov.kz") || host.endsWith(".edu") || host.endsWith(".edu.kz")) score += 5;
  if (isKazakhstanContext(query)) {
    if (host === "adilet.zan.kz") score += /(?:закон|статья|кодекс|правил|постановлен|указ|заң|law)/iu.test(query) ? 12 : 5;
    if (host === "stat.gov.kz") score += /(?:статист|населени|халық\s+саны|population|statistic)/iu.test(query) ? 12 : 5;
    if (host === "nationalbank.kz") score += /(?:банк|ставк|мөлшерлем|курс|бағам|тенге|теңге|bank|rate)/iu.test(query) ? 12 : 5;
    if (host === "akorda.kz") score += /(?:президент|president|акорд)/iu.test(query) ? 12 : 6;
    if (host === "e-history.kz") score += HISTORICAL_OR_GEOGRAPHIC.test(query) ? 12 : 5;
    if (host === "gov.kz" || host.endsWith(".gov.kz")) score += 8;
  }
  return score;
}

function relevanceScore(text: string, query: string) {
  const tokens = sanitizeSearchQuery(query).toLocaleLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? [];
  if (!tokens.length) return 0;
  const haystack = text.toLocaleLowerCase();
  return Math.min(6, tokens.reduce((score, token) => score + (haystack.includes(token) ? 1 : 0), 0));
}

export function rankGroundedResults<T extends { url: string; title: string; description: string }>(query: string, results: readonly T[]) {
  return results
    .map((result, index) => ({
      result,
      index,
      score: sourceAuthorityScore(result.url, query) + relevanceScore(`${result.title} ${result.description}`, query),
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ result }) => result);
}

export function kazakhstanGroundingContext(value: string) {
  if (!isKazakhstanContext(value)) return "";
  const entity = entityVariants(value);
  return [
    "KAZAKHSTAN CONTEXT:",
    "- Treat Russian, Kazakh, and English spellings/transliterations of Kazakhstan entities as possible aliases, not unrelated concepts.",
    entity ? `- Resolved entity family: ${entity.ru} / ${entity.kk} / ${entity.en}.` : "- Prefer Kazakhstan-specific interpretation when the wording clearly points to Kazakhstan.",
    "- Prefer official Kazakhstan sources for law, government, statistics, and central-bank facts; prefer reputable historical/academic sources for history.",
    "- Search in Russian and Kazakh when that improves recall, while answering in the user's language.",
  ].join("\n");
}
