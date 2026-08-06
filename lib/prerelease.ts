import type { Locale } from "@/lib/i18n";
import type { PublicReleaseNote } from "@/lib/latest-release";

export interface PreviewReleaseNote extends PublicReleaseNote {
  channel: "preview";
  majorUpdate: true;
  codename: "Erma Nova";
  stability: "beta";
  knownIssues: string[];
  migrationNotes: string[];
}

const PREVIEW_RELEASE: Record<Locale, PreviewReleaseNote> = {
  ru: {
    date: "06 авг. 2026",
    version: "v0.16.0-beta.2",
    title: "ERMA NOVA — Architecture Foundation",
    summary: "КРУПНОЕ ОБНОВЛЕНИЕ · ПРЕДВАРИТЕЛЬНАЯ ВЕРСИЯ. Архитектурный фундамент для дальнейшего роста Erma Nova: разделённый AI orchestration, единый quota lifecycle и автоматические границы против повторного появления монолитного route.",
    changes: [
      "AI demo route разделён на contracts, HTTP mapping, quota lifecycle и provider fallback policy.",
      "Публичные и привилегированные запросы теперь используют единый идемпотентный интерфейс commit/release.",
      "Основной route сокращён примерно с 558 до 405 строк без изменения JSON и SSE контрактов.",
      "Добавлены architecture contract tests и лимит в 450 строк для orchestration route.",
      "Опубликована архитектурная документация с invariants и безопасной последовательностью следующих рефакторингов.",
      "Сохранены Erma Nova Workspace, локальный Artifact Studio и Agent Run Protocol 2.0 из beta.1.",
    ],
    channel: "preview",
    majorUpdate: true,
    codename: "Erma Nova",
    stability: "beta",
    knownIssues: [
      "Agent Run timeline остаётся foundation surface; live wiring расширяется в следующих beta-патчах.",
      "Артефакты хранятся только на текущем устройстве.",
      "Browser-level Playwright suite ещё не подключён; текущий контур покрывает unit, integration и production build.",
    ],
    migrationNotes: [
      "Диалоги, проекты, черновики и артефакты beta.1 сохраняются без изменений.",
      "Публичные JSON и SSE контракты `/api/demo` не изменены.",
      "Provider keys, fallback configuration и quota persistence остаются server-only.",
    ],
  },
  en: {
    date: "06 Aug 2026",
    version: "v0.16.0-beta.2",
    title: "ERMA NOVA — Architecture Foundation",
    summary: "MAJOR UPDATE · PRE-RELEASE. The architecture foundation for continued Erma Nova growth: separated AI orchestration, one quota lifecycle, and automated boundaries that prevent the demo route from becoming monolithic again.",
    changes: [
      "Split the AI demo route into contracts, HTTP mapping, quota lifecycle, and provider fallback policy.",
      "Public and privileged requests now share one idempotent commit/release interface.",
      "Reduced the main route from roughly 558 to 405 lines without changing JSON or SSE contracts.",
      "Added architecture contract tests and a 450-line budget for the orchestration route.",
      "Published architecture documentation with invariants and the safe sequence for the next refactors.",
      "Retained the Erma Nova Workspace, local Artifact Studio, and Agent Run Protocol 2.0 from beta.1.",
    ],
    channel: "preview",
    majorUpdate: true,
    codename: "Erma Nova",
    stability: "beta",
    knownIssues: [
      "The Agent Run timeline remains a foundation surface; live wiring expands in later beta patches.",
      "Artifacts remain on the current device.",
      "A browser-level Playwright suite is not connected yet; the current gate covers unit, integration, and production build checks.",
    ],
    migrationNotes: [
      "beta.1 conversations, projects, drafts, and artifacts remain unchanged.",
      "The public `/api/demo` JSON and SSE contracts are unchanged.",
      "Provider keys, fallback configuration, and quota persistence remain server-only.",
    ],
  },
};

export function getPreviewRelease(locale: Locale): PreviewReleaseNote {
  const release = PREVIEW_RELEASE[locale];
  return {
    ...release,
    changes: [...release.changes],
    knownIssues: [...release.knownIssues],
    migrationNotes: [...release.migrationNotes],
  };
}
