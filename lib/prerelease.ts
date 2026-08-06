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
    version: "v0.16.0-beta.1",
    title: "ERMA NOVA — Intelligent Workspace",
    summary: "КРУПНОЕ ОБНОВЛЕНИЕ · ПРЕДВАРИТЕЛЬНАЯ ВЕРСИЯ. Первый вертикальный срез нового рабочего пространства с Agent Runs v2, локальными редактируемыми артефактами и совместимым переходом от обычного чата.",
    changes: [
      "Добавлен Erma Nova Workspace с отдельными поверхностями Chat, Artifacts и Agent Runs.",
      "Artifact Studio хранит документы локально, поддерживает версии, восстановление, дублирование и экспорт.",
      "Опубликован типизированный Agent Run Protocol 2.0 с ограниченным набором событий и максимум шестью плановыми шагами.",
      "Существующий чат и локальная история встроены без разрушительной миграции данных.",
      "Prerelease оформлен отдельным каналом preview с codename, stability, known issues и migration notes.",
    ],
    channel: "preview",
    majorUpdate: true,
    codename: "Erma Nova",
    stability: "beta",
    knownIssues: [
      "Agent Run timeline пока является foundation surface; live wiring расширяется в следующих beta-патчах.",
      "Артефакты beta.1 хранятся только на текущем устройстве.",
      "PDF и DOCX export не входят в beta.1.",
    ],
    migrationNotes: [
      "Диалоги, проекты и черновики v0.15.0 сохраняются без изменений.",
      "Artifact Studio использует отдельный versioned localStorage namespace.",
    ],
  },
  en: {
    date: "06 Aug 2026",
    version: "v0.16.0-beta.1",
    title: "ERMA NOVA — Intelligent Workspace",
    summary: "MAJOR UPDATE · PRE-RELEASE. The first vertical slice of a new workspace with Agent Runs v2, local editable artifacts, and a compatible transition from normal chat.",
    changes: [
      "Added the Erma Nova Workspace with dedicated Chat, Artifacts, and Agent Runs surfaces.",
      "Artifact Studio stores documents locally and supports versions, restore, duplicate, and export.",
      "Published the typed Agent Run Protocol 2.0 with bounded events and at most six planned steps.",
      "Embedded the existing chat and local archive without a destructive data migration.",
      "Marked the release as a preview channel with codename, stability, known issues, and migration notes.",
    ],
    channel: "preview",
    majorUpdate: true,
    codename: "Erma Nova",
    stability: "beta",
    knownIssues: [
      "The Agent Run timeline is a foundation surface in beta.1; live wiring expands in later beta patches.",
      "Artifacts remain on the current device in beta.1.",
      "PDF and DOCX export are not part of beta.1.",
    ],
    migrationNotes: [
      "v0.15.0 conversations, projects, and drafts remain unchanged.",
      "Artifact Studio uses a separate versioned localStorage namespace.",
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
