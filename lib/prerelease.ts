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
  codename: "Erma Flow";
  stability: "beta";
  knownIssues: string[];
  migrationNotes: string[];
}

const PREVIEW_RELEASE: Record<Locale, PreviewReleaseNote> = {
  ru: {
    date: "07 авг. 2026",
    version: CURRENT_RELEASE_VERSION,
    title: "ERMA FLOW — Safe Prompt Branches",
    summary: "КРУПНОЕ ОБНОВЛЕНИЕ · ПРЕДВАРИТЕЛЬНАЯ ВЕРСИЯ. Редактирование старого запроса теперь создаёт безопасную ветку, сохраняет исходный диалог и переносит только контекст до выбранного сообщения.",
    changes: [
      "Редактирование пользовательского запроса больше не перезаписывает существующую цепочку ответов и не смешивает старое продолжение с новым.",
      "Перед редактированием текущий диалог сохраняется в локальном архиве как исходная версия, к которой можно вернуться одним действием.",
      "Для изменённого запроса создаётся отдельная ветка с точным контекстом до выбранного сообщения; сам запрос сразу открывается в composer.",
      "Первый запрос диалога также можно безопасно изменить: исходный разговор остаётся в архиве, а новая ветка начинается с чистого контекста.",
      "Composer показывает постоянный статус безопасного редактирования и ссылку на исходный диалог до завершения работы с новой веткой.",
      "Сохранены все возможности v0.16.4: Erma Flow, Agent Runs, Artifact Studio, мобильный чат и единая Motion System.",
    ],
    channel: CURRENT_RELEASE_CHANNEL,
    majorUpdate: true,
    codename: CURRENT_RELEASE_CODENAME,
    stability: "beta",
    knownIssues: [
      "Изменённая ветка хранится локально на текущем устройстве вместе с остальной историей диалогов.",
      "Автоматическое визуальное дерево всех родственных веток будет добавлено отдельным обновлением архива.",
      "Erma Flow использует текущую demo-квоту и те же ограничения доступа, что и основной AI-чат.",
    ],
    migrationNotes: [
      "Диалоги, проекты, черновики, версии ответов, Flow runs и артефакты предыдущих beta-релизов сохраняются без изменений.",
      "Новые серверные таблицы или API-контракты не требуются: безопасное ветвление использует существующий локальный архив.",
      "Service Worker cache namespace обновлён до `tklabs-v0.16.5-static`, поэтому устаревшие статические assets удаляются при активации.",
    ],
  },
  en: {
    date: "07 Aug 2026",
    version: CURRENT_RELEASE_VERSION,
    title: "ERMA FLOW — Safe Prompt Branches",
    summary: "MAJOR UPDATE · PRE-RELEASE. Editing an older prompt now creates a safe branch, preserves the original conversation, and carries forward only the context before the selected message.",
    changes: [
      "Editing a user prompt no longer overwrites the existing answer chain or mixes an old continuation with the new request.",
      "The current conversation is saved to the local archive before editing and remains available through a one-action return control.",
      "The edited request opens in a dedicated branch containing the exact conversation context before the selected message.",
      "The first prompt can also be edited safely: the original conversation remains archived while the new branch starts with a clean context.",
      "The composer keeps a persistent safe-edit status and an original-conversation recovery action while the branch is active.",
      "All v0.16.4 capabilities remain available: Erma Flow, Agent Runs, Artifact Studio, mobile chat, and the shared Motion System.",
    ],
    channel: CURRENT_RELEASE_CHANNEL,
    majorUpdate: true,
    codename: CURRENT_RELEASE_CODENAME,
    stability: "beta",
    knownIssues: [
      "Edited branches remain local to the current device together with the rest of the conversation archive.",
      "A visual tree for all related branches will be added in a separate archive update.",
      "Erma Flow uses the current demo quota and the same access limits as the main AI chat.",
    ],
    migrationNotes: [
      "Conversations, projects, drafts, response versions, Flow runs, and artifacts from earlier beta releases remain unchanged.",
      "No new server tables or API contracts are required; safe branching uses the existing local conversation archive.",
      "The Service Worker cache namespace is updated to `tklabs-v0.16.5-static`, removing outdated static assets on activation.",
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
