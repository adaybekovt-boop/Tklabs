import type { Locale } from "@/lib/i18n";
import type { PublicReleaseNote } from "@/lib/releases/types";

const RU: PublicReleaseNote[] = [
  {
    date: "09 авг. 2026",
    version: "v0.24.2",
    title: "Google Direct Grounding",
    summary: "Подходящие factual/current/research запросы теперь могут получать официальный Google Search grounded-ответ напрямую: Google формирует grounded text, citations и Search Suggestions, а Erma не пересказывает этот текст повторно через NVIDIA.",
    changes: [
      "Текущая реплика пользователя после privacy-minimization передаётся в Gemini Interactions API с Google Search tool без отправки полной истории чата.",
      "Полноценный grounded-ответ Google проходит direct pass-through в чат без NVIDIA rewriting.",
      "URL citations и Google Search Suggestions сохраняются и отображаются рядом с ответом в изолированном attribution UI.",
      "Если Google не выполнил поиск или не вернул полный attribution payload, Erma автоматически использует прежний проверяемый web-search pipeline.",
      "Blocked, restricted и high-impact safety-категории не используют direct pass-through и остаются в стандартном TK LAB safety/synthesis контуре.",
      "Grounding metadata сохраняется в локальном архиве, поэтому атрибуция не исчезает после перезагрузки страницы.",
      "Google quota и HTTP 429 нельзя обойти на стороне приложения; при недоступности direct grounding используется доступный fallback-путь.",
    ],
  },
  {
    date: "09 авг. 2026",
    version: "v0.24.1",
    title: "Grounding Reliability Hotfix",
    summary: "Исправлена реальная production-проблема v0.24.0: factual-router запускал web verification, но production мог быть развернут без настроенного search provider, после чего Erma дважды повторяла неудачный поиск и отвечала слишком длинным отказом.",
    changes: [
      "Production preflight теперь требует хотя бы один полный web-search provider, уже настроенный как encrypted Cloudflare Worker secret; deploy не изменяет secret state сам.",
      "Поддерживаются Gemini Google Search grounding, Brave Search либо полный legacy Google Custom Search pair.",
      "Если первый search_web завершается terminal failure, planner больше не повторяет тот же бесполезный поиск во втором раунде.",
      "Для статических низкорисковых фактических вопросов при временно недоступном web Erma может дать короткий best-effort фон с явной пометкой, что внешняя проверка не выполнена, вместо просьбы пользователю самому принести источники.",
      "Текущие, правовые, медицинские, финансовые, safety-critical и официально-статистические утверждения по-прежнему требуют внешнего evidence и не переводятся в уверенный memory-only fallback.",
      "Добавлены regression-тесты production search readiness, Cloudflare secret ownership, fallback-поведения и остановки повторных failed-search попыток.",
    ],
  },
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
    version: "v0.24.2",
    title: "Google Direct Grounding",
    summary: "Eligible factual/current/research requests can now use the official Google Search grounded answer directly: Google produces grounded text, citations, and Search Suggestions, and Erma no longer rewrites that text through NVIDIA.",
    changes: [
      "The privacy-minimized current user turn is sent to the Gemini Interactions API with the Google Search tool without sending the full chat history.",
      "A complete Google grounded answer is passed directly into chat without NVIDIA rewriting.",
      "URL citations and Google Search Suggestions are preserved and shown next to the answer in an isolated attribution surface.",
      "If Google does not execute search or does not return complete attribution, Erma automatically falls back to the existing verifiable web-search pipeline.",
      "Blocked, restricted, and high-impact safety categories do not use direct pass-through and stay inside the standard TK LAB safety/synthesis path.",
      "Grounding metadata is preserved in the local archive so attribution survives page reloads.",
      "Google quota and HTTP 429 cannot be bypassed by the application; an available fallback path is used when direct grounding is unavailable.",
    ],
  },
  {
    date: "09 Aug 2026",
    version: "v0.24.1",
    title: "Grounding Reliability Hotfix",
    summary: "Fixes the production failure reproduced after v0.24.0: factual routing attempted web verification, but production could deploy without a configured search provider, causing duplicate failed searches followed by an overly long refusal.",
    changes: [
      "Production preflight now requires at least one complete web-search provider already configured as an encrypted Cloudflare Worker secret; deployment does not mutate secret state itself.",
      "Supported providers are Gemini Google Search grounding, Brave Search, or the complete legacy Google Custom Search pair.",
      "A terminal search_web failure now stops the planner from repeating the same useless search in the next tool round.",
      "For static low-risk factual questions during a temporary web outage, Erma may provide concise best-effort background explicitly marked as not externally verified instead of asking the user to bring their own sources.",
      "Current, legal, medical, financial, safety-critical, and official-statistical claims remain evidence-bound and do not become confident memory-only fallbacks.",
      "Added regressions for production search readiness, Cloudflare secret ownership, fallback behavior, and stopping duplicate failed-search attempts.",
    ],
  },
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