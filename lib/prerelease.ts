import type { Locale } from "@/lib/i18n";
import { CURRENT_RELEASE_CHANNEL, CURRENT_RELEASE_CODENAME, CURRENT_RELEASE_VERSION } from "@/lib/release-version";
import type { PublicReleaseNote } from "@/lib/releases/types";

export interface PreviewReleaseNote extends PublicReleaseNote { channel: "preview"; majorUpdate: true; codename: typeof CURRENT_RELEASE_CODENAME; stability: "beta"; knownIssues: string[]; migrationNotes: string[]; }

const PREVIEW_RELEASE: Record<Locale, PreviewReleaseNote> = {
  ru: {
    date: "09 авг. 2026",
    version: CURRENT_RELEASE_VERSION,
    title: "ERMA GROUNDING RELIABILITY — Production Search Hotfix",
    summary: "HOTFIX ERMA · ПРЕДВАРИТЕЛЬНАЯ ВЕРСИЯ. v0.24.1 исправляет production wiring для Google/Brave web search, исключает повторный failed-search раунд и делает fallback статических фактов полезнее без ослабления evidence-требований для чувствительных и текущих данных.",
    changes: [
      "Production deploy синхронизирует настроенные search credentials из GitHub Actions в Cloudflare Worker через encrypted secrets.",
      "Deployment preflight теперь требует хотя бы один полный web-search provider и не позволяет тихо развернуть factual grounding без рабочего backend.",
      "Поддерживаются Gemini Google Search grounding, Brave Search и legacy Google Custom Search pair; ключи не передаются браузеру и не публикуются как --var.",
      "После terminal failure первого search_web planner прекращает дальнейшие web-search раунды, поэтому одна backend-проблема больше не превращается в две одинаковые ошибки.",
      "Для статических низкорисковых factual-вопросов при недоступном web Erma может дать краткий best-effort ответ с явным указанием, что внешняя проверка не выполнена, либо задать один точный уточняющий вопрос.",
      "Текущие, правовые, медицинские, финансовые, safety-critical и официально-статистические факты остаются evidence-bound.",
      "Regression suite воспроизводит production search readiness, Cloudflare secret wiring, полезный static fallback и остановку duplicate failed-search attempts.",
      "Kazakhstan Intelligence, Google-first ranking, privacy-minimized queries и 10 динамических режимов Erma из v0.24.0 сохранены.",
    ],
    channel: CURRENT_RELEASE_CHANNEL,
    majorUpdate: true,
    codename: CURRENT_RELEASE_CODENAME,
    stability: "beta",
    knownIssues: [
      "Для реального web grounding в production всё равно требуется действующий provider credential: GOOGLE_GEMINI_API_KEY/GEMINI_API_KEY, BRAVE_SEARCH_API_KEY либо полный legacy Google Custom Search pair.",
      "v0.24.1 не создаёт внешний API key автоматически и не может компенсировать истёкшую квоту или отказ самого поискового провайдера.",
      "При временной недоступности провайдера current/high-risk факты остаются непроверенными и не должны выдаваться как подтверждённые.",
      "Best-effort memory fallback разрешён только для статических низкорисковых вопросов и обязан явно сообщать об отсутствии внешней проверки.",
    ],
    migrationNotes: [
      "Новых D1 migrations в v0.24.1 нет.",
      "Перед production deploy необходимо добавить хотя бы один search credential в GitHub Actions Secrets; workflow безопасно синхронизирует его в Cloudflare Worker secrets.",
      "GOOGLE_GROUNDING_MODEL остаётся обычной server-side variable; provider API keys остаются encrypted secrets.",
      "Если ни один search provider не настроен, production preflight завершится ошибкой до deploy вместо публикации заведомо неработающего grounded-search path.",
    ],
  },
  en: {
    date: "09 Aug 2026",
    version: CURRENT_RELEASE_VERSION,
    title: "ERMA GROUNDING RELIABILITY — Production Search Hotfix",
    summary: "ERMA HOTFIX · PRE-RELEASE. v0.24.1 fixes production wiring for Google/Brave web search, removes duplicate failed-search rounds, and makes static-fact fallback more useful without weakening evidence requirements for sensitive or current data.",
    changes: [
      "Production deploy syncs configured search credentials from GitHub Actions into Cloudflare Worker encrypted secrets.",
      "Deployment preflight now requires at least one complete web-search provider and cannot silently deploy factual grounding without a working backend.",
      "Gemini Google Search grounding, Brave Search, and the legacy Google Custom Search pair are supported; keys are never sent to the browser or published as --var values.",
      "After a terminal failure of the first search_web call, the planner stops further web-search rounds so one backend failure no longer becomes two duplicate errors.",
      "For static low-risk factual questions during a web outage, Erma may give concise best-effort background explicitly marked as not externally verified, or ask one focused clarification.",
      "Current, legal, medical, financial, safety-critical, and official-statistical facts remain evidence-bound.",
      "The regression suite reproduces production search readiness, Cloudflare secret wiring, useful static fallback, and duplicate failed-search prevention.",
      "Kazakhstan Intelligence, Google-first ranking, privacy-minimized queries, and the ten dynamic Erma modes from v0.24.0 are preserved.",
    ],
    channel: CURRENT_RELEASE_CHANNEL,
    majorUpdate: true,
    codename: CURRENT_RELEASE_CODENAME,
    stability: "beta",
    knownIssues: [
      "Real production web grounding still requires a valid provider credential: GOOGLE_GEMINI_API_KEY/GEMINI_API_KEY, BRAVE_SEARCH_API_KEY, or the complete legacy Google Custom Search pair.",
      "v0.24.1 cannot create an external API key automatically and cannot compensate for exhausted provider quota or a provider outage.",
      "During provider outages, current/high-risk facts remain unverified and must not be presented as confirmed.",
      "Best-effort model-memory fallback is limited to static low-risk questions and must explicitly disclose missing external verification.",
    ],
    migrationNotes: [
      "v0.24.1 adds no D1 migrations.",
      "Before production deploy, add at least one search credential to GitHub Actions Secrets; the workflow securely synchronizes it into Cloudflare Worker secrets.",
      "GOOGLE_GROUNDING_MODEL remains a normal server-side variable while provider API keys remain encrypted secrets.",
      "If no search provider is configured, production preflight fails before deployment instead of publishing a known-broken grounded-search path.",
    ],
  },
};

export function getPreviewRelease(locale: Locale): PreviewReleaseNote {
  const release = PREVIEW_RELEASE[locale];
  return { ...release, changes: [...release.changes], knownIssues: [...release.knownIssues], migrationNotes: [...release.migrationNotes] };
}