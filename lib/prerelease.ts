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
    title: "ERMA FLOW — Motion & Controlled Work",
    summary: "КРУПНОЕ ОБНОВЛЕНИЕ · ПРЕДВАРИТЕЛЬНАЯ ВЕРСИЯ. Добавлены единая система анимаций для всего сайта, управляемые Erma Flow задачи со streaming-прогрессом, реальная история Agent Runs и сохранение результата в Artifact Studio.",
    changes: [
      "Весь сайт получил единый Motion System: route transitions, reveal-анимации, интерактивные состояния, анимации drawer, sheets, workspace, чата и артефактов.",
      "Добавлена новая рабочая область Erma Flow для сложных управляемых задач с этапами, Stop, streaming-результатом и локальной историей.",
      "Agent Runs теперь показывает реальные Flow-запуски, их timeline, модель, итог и связь с созданным артефактом.",
      "Результат Flow можно одним действием сохранить в Artifact Studio с автоматическим определением типа материала.",
      "Мобильный drawer получил прямой вход в Erma Flow, более чистую иерархию и анимированные переходы.",
      "Чат получил улучшенные анимации сообщений, composer, статуса, overlays и фонового состояния без нарушения reduced-motion.",
    ],
    channel: CURRENT_RELEASE_CHANNEL,
    majorUpdate: true,
    codename: CURRENT_RELEASE_CODENAME,
    stability: "beta",
    knownIssues: [
      "Редактирование старого запроса всё ещё переносит текст в composer; branch-preserving edit-and-resubmit остаётся следующим крупным этапом.",
      "Erma Flow использует текущую demo-квоту и те же ограничения доступа, что и основной AI-чат.",
      "Flow runs, артефакты и история диалогов хранятся локально на текущем устройстве.",
    ],
    migrationNotes: [
      "Диалоги, проекты, черновики, версии ответов и артефакты предыдущих beta-релизов сохраняются без изменений.",
      "Добавляется отдельное локальное хранилище `tklabs.erma-flow.runs.v1`; существующие ключи не изменяются.",
      "Публичные JSON и SSE контракты `/api/demo` не изменены; Flow использует существующий streaming API.",
    ],
  },
  en: {
    date: "07 Aug 2026",
    version: CURRENT_RELEASE_VERSION,
    title: "ERMA FLOW — Motion & Controlled Work",
    summary: "MAJOR UPDATE · PRE-RELEASE. Added one site-wide motion system, controlled Erma Flow tasks with streaming progress, real Agent Run history, and one-action result delivery into Artifact Studio.",
    changes: [
      "Added one site-wide Motion System covering route transitions, reveals, interactive states, drawers, sheets, workspaces, chat, and artifacts.",
      "Added the Erma Flow workspace for controlled complex tasks with explicit stages, Stop, streaming output, and local history.",
      "Agent Runs now displays real Flow executions, timelines, model metadata, outcomes, and artifact links.",
      "Flow results can be saved to Artifact Studio in one action with automatic material-type detection.",
      "Added direct Erma Flow access to the mobile drawer with a cleaner hierarchy and animated transitions.",
      "Improved chat message, composer, status, overlay, and ambient animations while respecting reduced-motion preferences.",
    ],
    channel: CURRENT_RELEASE_CHANNEL,
    majorUpdate: true,
    codename: CURRENT_RELEASE_CODENAME,
    stability: "beta",
    knownIssues: [
      "Editing an older prompt still moves its text into the composer; branch-preserving edit-and-resubmit remains the next major stage.",
      "Erma Flow uses the current demo quota and the same access limits as the main AI chat.",
      "Flow runs, artifacts, and conversation history remain local to the current device.",
    ],
    migrationNotes: [
      "Conversations, projects, drafts, response versions, and artifacts from earlier beta releases remain unchanged.",
      "A separate `tklabs.erma-flow.runs.v1` local store is added; existing storage keys are not changed.",
      "The public `/api/demo` JSON and SSE contracts are unchanged; Flow consumes the existing streaming API.",
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
