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
    date: "07 авг. 2026",
    version: CURRENT_RELEASE_VERSION,
    title: "ERMA NOVA — Mobile Chat Rebuild",
    summary: "КРУПНОЕ ОБНОВЛЕНИЕ · ПРЕДВАРИТЕЛЬНАЯ ВЕРСИЯ. Мобильный AI-чат перестроен как самостоятельный интерфейс: одна шапка, полноэкранная история, новый composer, чистый поток сообщений и действия через нижние панели.",
    changes: [
      "Дублирующая мобильная workspace-шапка удалена из режима чата.",
      "История диалогов перенесена в полноразмерный левый drawer с проектами, поиском и быстрым созданием чата.",
      "Добавлен отдельный мобильный composer с видимыми файлами, прямой кнопкой вложения и контекстной Voice / Send / Stop кнопкой.",
      "Модель, формат ответа, глубина и reasoning собраны в отдельной нижней панели настроек.",
      "Ответы Erma на телефоне больше не заключены в тяжёлые карточки; действия открываются через мобильный action sheet.",
      "Artifacts и Agent Runs доступны из мобильного меню без постоянной второй строки навигации.",
    ],
    channel: CURRENT_RELEASE_CHANNEL,
    majorUpdate: true,
    codename: CURRENT_RELEASE_CODENAME,
    stability: "beta",
    knownIssues: [
      "Редактирование старого запроса пока переносит текст в composer; сохранение ветки с точки редактирования будет подключено следующим патчем.",
      "Browser-level Playwright suite ещё не подключён; текущий контур защищён integration contracts и production build.",
      "Артефакты и история диалогов по-прежнему хранятся на текущем устройстве.",
    ],
    migrationNotes: [
      "Диалоги, проекты, черновики, версии ответов и артефакты beta.1–beta.3 сохраняются без изменений.",
      "Публичные JSON и SSE контракты `/api/demo` не изменены.",
      "Desktop composer и desktop message stream сохранены как стабильный fallback на время мобильной миграции.",
    ],
  },
  en: {
    date: "07 Aug 2026",
    version: CURRENT_RELEASE_VERSION,
    title: "ERMA NOVA — Mobile Chat Rebuild",
    summary: "MAJOR UPDATE · PRE-RELEASE. The mobile AI chat is now a dedicated interface with one header, a full-height history drawer, a new composer, a cleaner message stream, and bottom-sheet actions.",
    changes: [
      "Removed the duplicate mobile workspace header from the chat surface.",
      "Moved conversation history into a full-height left drawer with projects, search, and a prominent new-chat action.",
      "Added a dedicated mobile composer with visible attachments, a direct add-file button, and contextual Voice / Send / Stop behavior.",
      "Moved model, response mode, effort, and reasoning into one focused bottom sheet.",
      "Removed heavy assistant cards on phones and moved secondary actions into a mobile action sheet.",
      "Made Artifacts and Agent Runs reachable from the mobile drawer without a permanent second navigation row.",
    ],
    channel: CURRENT_RELEASE_CHANNEL,
    majorUpdate: true,
    codename: CURRENT_RELEASE_CODENAME,
    stability: "beta",
    knownIssues: [
      "Editing an older prompt still moves its text into the composer; branch-preserving edit-and-resubmit is scheduled for the next patch.",
      "A browser-level Playwright suite is not connected yet; integration contracts and the production build protect the current surface.",
      "Artifacts and conversation history remain local to the current device.",
    ],
    migrationNotes: [
      "beta.1–beta.3 conversations, projects, drafts, response versions, and artifacts remain unchanged.",
      "The public `/api/demo` JSON and SSE contracts are unchanged.",
      "The desktop composer and desktop message stream remain the stable fallback during the mobile migration.",
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
