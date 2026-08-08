import type { Locale } from "@/lib/i18n";
import type { PublicReleaseNote } from "@/lib/releases/types";

const RU: PublicReleaseNote[] = [
  {
    date: "09 авг. 2026",
    version: "v0.24.0",
    title: "Erma Grounded Search & Kazakhstan Intelligence",
    summary: "Точные и актуальные вопросы теперь проходят отдельный factual-routing: Erma автоматически ищет подтверждение в интернете, разрешает казахстанские сущности и не должна уверенно угадывать при отсутствии evidence.",
    changes: [
      "Добавлен fact_lookup route: рискованные точные вопросы автоматически получают web verification и ссылки на источники вместо прямого ответа из весов модели.",
      "Web Intelligence стал Google-first: Grounding with Google Search используется первым при наличии ключа; существующий Google Programmable Search и Brave остаются bounded fallback-провайдерами.",
      "Для Казахстана добавлено распознавание RU/KZ/EN алиасов, включая Старший жуз / Ұлы жүз / Uly Zhuz, а поиск может расширяться на несколько языковых вариантов.",
      "Источники ранжируются с тематическим приоритетом официальных ресурсов Казахстана: Adilet, Бюро национальной статистики, Нацбанк, Akorda, gov.kz и e-history.kz.",
      "Поисковый запрос минимизируется отдельно от истории чата: email, телефоны, URL и token-like значения удаляются перед отправкой внешнему поисковому провайдеру.",
      "Web reader извлекает main/article, title, description и дату публикации, отбрасывая навигацию, скрипты и другие шумовые блоки.",
      "Exact factual answers fail closed: если подтверждение не найдено или источник не открыт, Erma получает unverified/partial статус и инструкцию не выдавать догадку как факт.",
      "Factual-risk routing поднимает такие запросы минимум до Erma Core; 10 динамических режимов характера из предыдущей сборки сохранены.",
      "Добавлен regression-набор v0.24 для маршрутизации, приватности поиска, казахстанских алиасов, source authority, model tier и fail-closed verification.",
    ],
  },
];

const EN: PublicReleaseNote[] = [
  {
    date: "09 Aug 2026",
    version: "v0.24.0",
    title: "Erma Grounded Search & Kazakhstan Intelligence",
    summary: "Exact and current questions now use dedicated factual routing: Erma automatically seeks web evidence, resolves Kazakhstan entities, and must not confidently guess when evidence is missing.",
    changes: [
      "Added a fact_lookup route so high-risk exact questions automatically require web verification and source links instead of a direct model-memory answer.",
      "Web Intelligence is Google-first: Grounding with Google Search is preferred when configured, with existing Google Programmable Search and Brave kept as bounded fallbacks.",
      "Kazakhstan entity resolution recognizes RU/KZ/EN aliases including Senior Zhuz / Ұлы жүз / Uly Zhuz and may expand searches across multiple language variants.",
      "Source ranking gives topic-specific priority to official Kazakhstan resources including Adilet, the Bureau of National Statistics, National Bank, Akorda, gov.kz, and e-history.kz.",
      "Search queries are minimized separately from chat history: email addresses, phone-like values, URLs, and token-like values are removed before an external search request.",
      "The web reader extracts main/article content, title, description, and publication date while dropping navigation, scripts, and other page noise.",
      "Exact factual answers fail closed: missing or unopened evidence produces an unverified/partial state and an explicit instruction not to present a guess as fact.",
      "Factual-risk routing promotes these requests to at least Erma Core while preserving the previous build's ten dynamic personality modes.",
      "Added a v0.24 regression suite for routing, search privacy, Kazakhstan aliases, source authority, model tier selection, and fail-closed verification.",
    ],
  },
];

export function getGroundedSearchReleases(locale: Locale) {
  return (locale === "ru" ? RU : EN).map((entry) => ({ ...entry, changes: [...entry.changes] }));
}
