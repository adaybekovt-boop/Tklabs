import type { Locale } from "@/lib/i18n";
import { CURRENT_RELEASE_CHANNEL, CURRENT_RELEASE_CODENAME, CURRENT_RELEASE_VERSION } from "@/lib/release-version";
import type { PublicReleaseNote } from "@/lib/releases/types";

export interface PreviewReleaseNote extends PublicReleaseNote { channel: "preview"; majorUpdate: true; codename: typeof CURRENT_RELEASE_CODENAME; stability: "beta"; knownIssues: string[]; migrationNotes: string[]; }

const PREVIEW_RELEASE: Record<Locale, PreviewReleaseNote> = {
  ru: {
    date: "09 авг. 2026",
    version: CURRENT_RELEASE_VERSION,
    title: "ERMA GROUNDED SEARCH — Google Search & Kazakhstan Intelligence",
    summary: "КРУПНОЕ ОБНОВЛЕНИЕ ERMA · ПРЕДВАРИТЕЛЬНАЯ ВЕРСИЯ. v0.24.0 переводит точные и актуальные вопросы на evidence-first routing: Erma автоматически ищет подтверждение, разрешает казахстанские сущности и не должна уверенно угадывать факт при отсутствии источника.",
    changes: [
      "Добавлен fact_lookup route: рискованные точные вопросы автоматически получают web verification и ссылки на источники вместо прямого ответа из весов модели.",
      "Web Intelligence стал Google-first: Grounding with Google Search используется первым при наличии серверного ключа; Google Programmable Search для существующих клиентов и Brave Search остаются bounded fallback-провайдерами.",
      "Для Казахстана добавлено распознавание RU/KZ/EN алиасов, включая Старший жуз / Ұлы жүз / Uly Zhuz, с многоязычным расширением поисковых запросов.",
      "Источники ранжируются с тематическим приоритетом официальных ресурсов Казахстана: Adilet, Бюро национальной статистики, Нацбанк, Akorda, gov.kz и e-history.kz.",
      "Поисковый запрос минимизируется отдельно от истории чата: email, телефоны, URL и token-like значения удаляются перед внешним поиском.",
      "Web reader извлекает main/article, title, description и дату публикации, отбрасывая навигацию, скрипты и шумовые блоки.",
      "Exact factual answers fail closed: если подтверждение не найдено или источник не открыт, Erma получает unverified/partial статус и инструкцию не выдавать догадку как факт.",
      "Factual-risk routing поднимает такие запросы минимум до Erma Core, при этом 10 динамических режимов характера из предыдущей сборки полностью сохранены.",
      "Добавлен 150-case Kazakhstan Exactness Benchmark на русском, казахском и английском плюс regression-проверки privacy, source authority, routing и fail-closed verification.",
      "В интерфейсе tool activity теперь явно показывается web verification и количество реально открытых источников без раскрытия hidden reasoning.",
    ],
    channel: CURRENT_RELEASE_CHANNEL,
    majorUpdate: true,
    codename: CURRENT_RELEASE_CODENAME,
    stability: "beta",
    knownIssues: [
      "Предпочтительный Google Search path требует серверный GOOGLE_GEMINI_API_KEY или GEMINI_API_KEY. Без него Erma использует настроенный fallback, если он доступен.",
      "Google Programmable Search оставлен только как legacy fallback для существующих клиентов; новым конфигурациям следует использовать Google Search grounding.",
      "Если ни один web-search provider не настроен или временно недоступен, grounded factual route fail-closed и сообщает о неполной внешней проверке вместо уверенной догадки.",
      "Source ranking повышает доверие к официальным ресурсам, но не делает любой текст на таком домене автоматически истинным; финальный ответ по-прежнему ограничен фактически полученным evidence.",
      "Релиз не превращает каждый запрос в web search: casual, creative, локальная работа с файлами и детерминированная математика сохраняют отдельные маршруты.",
    ],
    migrationNotes: [
      "Новых D1 migrations в v0.24.0 нет.",
      "Для предпочтительного Google path нужен новый optional server-only secret GOOGLE_GEMINI_API_KEY (или GEMINI_API_KEY); браузеру он не передаётся.",
      "BRAVE_SEARCH_API_KEY остаётся поддерживаемым fallback; GOOGLE_SEARCH_API_KEY + GOOGLE_SEARCH_CX поддерживаются как legacy Google fallback.",
      "Product Facts раскрывают отдельный ephemeral web-grounding data route и указывают, что полный chat history не отправляется как поисковый запрос.",
    ],
  },
  en: {
    date: "09 Aug 2026",
    version: CURRENT_RELEASE_VERSION,
    title: "ERMA GROUNDED SEARCH — Google Search & Kazakhstan Intelligence",
    summary: "MAJOR ERMA UPDATE · PRE-RELEASE. v0.24.0 moves exact and current questions to evidence-first routing: Erma automatically seeks confirmation, resolves Kazakhstan entities, and must not confidently guess a fact when source evidence is missing.",
    changes: [
      "Added a fact_lookup route so high-risk exact questions automatically require web verification and source links instead of a direct model-memory answer.",
      "Web Intelligence is Google-first: Grounding with Google Search is preferred when a server key is configured, while Google Programmable Search for existing customers and Brave Search remain bounded fallbacks.",
      "Kazakhstan entity resolution recognizes RU/KZ/EN aliases including Senior Zhuz / Старший жуз / Ұлы жүз / Uly Zhuz and can expand searches across language variants.",
      "Source ranking gives topic-specific priority to official Kazakhstan resources including Adilet, the Bureau of National Statistics, National Bank, Akorda, gov.kz, and e-history.kz.",
      "Search queries are minimized separately from chat history: email addresses, phone-like values, URLs, and token-like values are removed before external search.",
      "The web reader extracts main/article content, title, description, and publication date while dropping navigation, scripts, and common page noise.",
      "Exact factual answers fail closed: missing or unopened evidence produces an unverified/partial state and an explicit instruction not to present a guess as fact.",
      "Factual-risk routing promotes these requests to at least Erma Core while fully preserving the previous build's ten dynamic personality modes.",
      "Added a 150-case Kazakhstan Exactness Benchmark across Russian, Kazakh, and English plus regressions for privacy, source authority, routing, and fail-closed verification.",
      "Tool activity now surfaces web verification and the count of actually opened sources without exposing hidden reasoning.",
    ],
    channel: CURRENT_RELEASE_CHANNEL,
    majorUpdate: true,
    codename: CURRENT_RELEASE_CODENAME,
    stability: "beta",
    knownIssues: [
      "The preferred Google Search path requires a server-side GOOGLE_GEMINI_API_KEY or GEMINI_API_KEY. Without it, Erma uses a configured fallback when available.",
      "Google Programmable Search is retained only as a legacy fallback for existing customers; new configurations should use Google Search grounding.",
      "If no web-search provider is configured or providers are temporarily unavailable, grounded factual routes fail closed and disclose incomplete external verification instead of making a confident guess.",
      "Source ranking increases the priority of official resources but does not make every statement on an official domain automatically true; final answers remain bounded by retrieved evidence.",
      "The release does not turn every request into web search: casual conversation, creative work, local document work, and deterministic math keep separate routes.",
    ],
    migrationNotes: [
      "v0.24.0 adds no D1 migrations.",
      "The preferred Google path needs a new optional server-only GOOGLE_GEMINI_API_KEY (or GEMINI_API_KEY); it is never exposed to the browser.",
      "BRAVE_SEARCH_API_KEY remains a supported fallback; GOOGLE_SEARCH_API_KEY + GOOGLE_SEARCH_CX remain available as the legacy Google fallback.",
      "Product Facts disclose the separate ephemeral web-grounding data route and state that full chat history is not sent as a search query.",
    ],
  },
};

export function getPreviewRelease(locale: Locale): PreviewReleaseNote {
  const release = PREVIEW_RELEASE[locale];
  return { ...release, changes: [...release.changes], knownIssues: [...release.knownIssues], migrationNotes: [...release.migrationNotes] };
}
