import type { Locale } from "@/lib/i18n";
import { CURRENT_RELEASE_CHANNEL, CURRENT_RELEASE_CODENAME, CURRENT_RELEASE_VERSION } from "@/lib/release-version";
import type { PublicReleaseNote } from "@/lib/releases/types";

export interface PreviewReleaseNote extends PublicReleaseNote { channel: "preview"; majorUpdate: true; codename: typeof CURRENT_RELEASE_CODENAME; stability: "beta"; knownIssues: string[]; migrationNotes: string[]; }

const PREVIEW_RELEASE: Record<Locale, PreviewReleaseNote> = {
  ru: {
    date: "09 авг. 2026",
    version: CURRENT_RELEASE_VERSION,
    title: "GOOGLE DIRECT GROUNDING — прямой grounded-ответ",
    summary: "ОБНОВЛЕНИЕ ERMA · ПРЕДВАРИТЕЛЬНАЯ ВЕРСИЯ. v0.24.2 переводит подходящие factual/current/research запросы на официальный Google Search grounding: текущая реплика пользователя передаётся Google в минимизированном виде, а полноценный grounded-ответ Google показывается в чате напрямую без повторного пересказа NVIDIA.",
    changes: [
      "Для подходящих factual/current/research запросов Erma отправляет Google Search grounding текущую реплику пользователя почти как есть; полная история диалога поисковому провайдеру не передаётся.",
      "Если Google возвращает полноценный grounded-ответ, Erma показывает его текст напрямую и не запускает поверх него NVIDIA-перефразирование.",
      "Вместе с ответом сохраняются и отображаются Google Search Suggestions и URL-citations, возвращённые официальным Gemini Interactions API.",
      "Google attribution изолирован в sandboxed UI-контейнере, а внешние ссылки валидируются перед отображением.",
      "Google-grounding metadata теперь сохраняется в локальном архиве вместе с сообщением, поэтому атрибуция не исчезает после перезагрузки страницы.",
      "Если Google не выполнил поиск, не вернул citations/Search Suggestions или временно недоступен, Erma автоматически возвращается к существующему проверяемому web-search pipeline.",
      "High-impact, restricted и заблокированные safety-категории не используют прямой passthrough и остаются внутри стандартного TK LAB safety/synthesis контура.",
      "Kazakhstan Intelligence, entity disambiguation, privacy-minimized search, source ranking и fallback-провайдеры v0.24.0–v0.24.1 сохранены.",
    ],
    channel: CURRENT_RELEASE_CHANNEL,
    majorUpdate: true,
    codename: CURRENT_RELEASE_CODENAME,
    stability: "beta",
    knownIssues: [
      "Это официальный Google Search grounded-ответ через Gemini API, а не скрейпинг потребительского блока AI Overview на google.com; формулировка может отличаться от Google app/Search UI.",
      "Google quota и rate limits продолжают действовать. При HTTP 429 или временной ошибке провайдера используется существующий fallback-путь; приложение не может обойти исчерпанную квоту Google.",
      "По действующим условиям Grounding with Google Search Google хранит prompt, contextual information и generated output 30 дней для grounded results/Search Suggestions; отключить это хранение для данной функции нельзя.",
      "Прямой passthrough включается только когда Google действительно выполнил web search и вернул полный набор атрибуции; иначе ответ синтезируется обычным Erma pipeline.",
    ],
    migrationNotes: [
      "Новых D1 migrations в v0.24.2 нет.",
      "Для direct grounding нужен существующий Cloudflare Worker secret GOOGLE_GEMINI_API_KEY либо GEMINI_API_KEY.",
      "GOOGLE_GROUNDING_MODEL остаётся обычной server-side variable; API key не передаётся браузеру и не записывается в репозиторий.",
      "Legal bundle обновлён до 2026-08-09 из-за нового внешнего Google Search grounding processing и раскрытия 30-дневного retention; интерфейс согласия должен использовать новый digest.",
      "Локальный архив автоматически принимает новый provider marker google-grounding и сохраняет bounded grounding metadata.",
    ],
  },
  en: {
    date: "09 Aug 2026",
    version: CURRENT_RELEASE_VERSION,
    title: "GOOGLE DIRECT GROUNDING — direct grounded answers",
    summary: "ERMA UPDATE · PRE-RELEASE. v0.24.2 moves eligible factual/current/research requests to official Google Search grounding: the minimized current user turn is sent to Google and a complete Google-grounded answer is displayed directly in chat without an additional NVIDIA rewrite.",
    changes: [
      "For eligible factual/current/research requests, Erma sends Google Search grounding the current user turn nearly as written; the full conversation history is not sent to the search provider.",
      "When Google returns a complete grounded answer, Erma displays that text directly and does not run an NVIDIA paraphrase over it.",
      "Google Search Suggestions and URL citations returned by the official Gemini Interactions API are preserved and shown with the answer.",
      "Google attribution is isolated in a sandboxed UI container and external citation URLs are validated before display.",
      "Google-grounding metadata is now preserved in the local archive with the message so attribution survives page reloads.",
      "If Google did not search, omitted citations/Search Suggestions, or is temporarily unavailable, Erma automatically returns to the existing verifiable web-search pipeline.",
      "High-impact, restricted, and blocked safety categories do not use direct pass-through and remain inside the standard TK LAB safety/synthesis path.",
      "Kazakhstan Intelligence, entity disambiguation, privacy-minimized search, source ranking, and v0.24.0–v0.24.1 fallback providers remain intact.",
    ],
    channel: CURRENT_RELEASE_CHANNEL,
    majorUpdate: true,
    codename: CURRENT_RELEASE_CODENAME,
    stability: "beta",
    knownIssues: [
      "This is the official Google Search grounded response through the Gemini API, not scraping of the consumer AI Overview block on google.com; wording may differ from the Google app/Search UI.",
      "Google quota and rate limits still apply. HTTP 429 or transient provider failures use the existing fallback path; the application cannot bypass exhausted Google quota.",
      "Under the current Grounding with Google Search terms, Google stores prompts, contextual information, and generated output for 30 days to create grounded results/Search Suggestions, and this storage cannot be disabled for the feature.",
      "Direct pass-through is used only when Google actually performs web search and returns complete attribution; otherwise the normal Erma pipeline synthesizes the response.",
    ],
    migrationNotes: [
      "v0.24.2 adds no D1 migrations.",
      "Direct grounding requires an existing GOOGLE_GEMINI_API_KEY or GEMINI_API_KEY Cloudflare Worker secret.",
      "GOOGLE_GROUNDING_MODEL remains a normal server-side variable; the API key is never sent to the browser or stored in the repository.",
      "The legal bundle was updated to 2026-08-09 for the new external Google Search grounding processing and 30-day retention disclosure; the consent surface must use the new digest.",
      "The local archive now accepts the google-grounding provider marker and preserves bounded grounding metadata.",
    ],
  },
};

export function getPreviewRelease(locale: Locale): PreviewReleaseNote {
  const release = PREVIEW_RELEASE[locale];
  return { ...release, changes: [...release.changes], knownIssues: [...release.knownIssues], migrationNotes: [...release.migrationNotes] };
}