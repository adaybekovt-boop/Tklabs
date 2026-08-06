import type { Locale } from "@/lib/i18n";
import {
  CURRENT_RELEASE_CHANNEL,
  CURRENT_RELEASE_CODENAME,
  CURRENT_RELEASE_VERSION,
} from "@/lib/release-version";
import type { PublicReleaseNote } from "@/lib/releases/types";

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
    version: CURRENT_RELEASE_VERSION,
    title: "ERMA NOVA — Interface Reliability",
    summary: "КРУПНОЕ ОБНОВЛЕНИЕ · ПРЕДВАРИТЕЛЬНАЯ ВЕРСИЯ. Исправлена рассинхронизация версии на главной странице, устранены мобильные пересечения элементов и улучшена работа Artifact Studio на небольших экранах.",
    changes: [
      "Главная страница, Patch Notes и Erma Nova Workspace теперь используют единый источник текущей версии.",
      "Устранены устаревшие подписи v0.15.0 и beta.1 в актуальных интерфейсах.",
      "Переключатель RU/EN встроен в workspace header и больше не перекрывает навигацию на телефоне.",
      "Workspace tabs получили корректные tab roles, aria-controls и безопасное восстановление состояния.",
      "Artifact Studio получил мобильный выбор артефактов и доступ к истории версий без desktop-панелей.",
      "Локальные настройки языка и workspace не ломают интерфейс, если browser storage недоступен.",
    ],
    channel: CURRENT_RELEASE_CHANNEL,
    majorUpdate: true,
    codename: CURRENT_RELEASE_CODENAME,
    stability: "beta",
    knownIssues: [
      "Agent Run timeline остаётся foundation surface; live wiring расширяется в следующих beta-патчах.",
      "Артефакты хранятся только на текущем устройстве.",
      "Browser-level Playwright suite ещё не подключён; UI-инварианты защищены integration contracts и production build.",
    ],
    migrationNotes: [
      "Диалоги, проекты, черновики и артефакты beta.1–beta.2 сохраняются без изменений.",
      "Публичные JSON и SSE контракты `/api/demo` не изменены.",
      "Новый source of truth версии не меняет формат истории стабильных релизов.",
    ],
  },
  en: {
    date: "06 Aug 2026",
    version: CURRENT_RELEASE_VERSION,
    title: "ERMA NOVA — Interface Reliability",
    summary: "MAJOR UPDATE · PRE-RELEASE. Fixed the stale version on the home page, removed mobile control collisions, and improved Artifact Studio on smaller screens.",
    changes: [
      "The home page, Patch Notes, and Erma Nova Workspace now share one current-release source of truth.",
      "Removed stale v0.15.0 and beta.1 labels from current product surfaces.",
      "Moved the RU/EN control into the workspace header so it no longer overlaps mobile navigation.",
      "Added correct tab roles, aria-controls, and storage-safe workspace state restoration.",
      "Added mobile artifact selection and version-history access without desktop side panels.",
      "Language and workspace controls remain usable when browser storage is unavailable.",
    ],
    channel: CURRENT_RELEASE_CHANNEL,
    majorUpdate: true,
    codename: CURRENT_RELEASE_CODENAME,
    stability: "beta",
    knownIssues: [
      "The Agent Run timeline remains a foundation surface; live wiring expands in later beta patches.",
      "Artifacts remain on the current device.",
      "A browser-level Playwright suite is not connected yet; UI invariants are protected by integration contracts and the production build.",
    ],
    migrationNotes: [
      "beta.1–beta.2 conversations, projects, drafts, and artifacts remain unchanged.",
      "The public `/api/demo` JSON and SSE contracts are unchanged.",
      "The current-release source of truth does not change stable release-history data.",
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
