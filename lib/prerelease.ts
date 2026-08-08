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
  codename: typeof CURRENT_RELEASE_CODENAME;
  stability: "beta";
  knownIssues: string[];
  migrationNotes: string[];
}

const PREVIEW_RELEASE: Record<Locale, PreviewReleaseNote> = {
  ru: {
    date: "08 авг. 2026",
    version: CURRENT_RELEASE_VERSION,
    title: "WORKSPACE EVOLUTION — Mobile, Memory, Flow, Files & Sync",
    summary: "КРУПНОЕ ОБНОВЛЕНИЕ · ПРЕДВАРИТЕЛЬНАЯ ВЕРСИЯ. Серия v0.19 превращает TK Lab в цельную рабочую среду: единый мобильный shell, структурированная память длинных диалогов, multi-round Erma Flow, документы и артефакты, опциональный зашифрованный sync и управляемые PWA-обновления.",
    changes: [
      "Mobile Shell 2.0 убирает двойную глобальную навигацию и добавляет прямой switcher Chat / Flow / Artifacts / Runs.",
      "Mobile Chat Pro стабилизирует VisualViewport, экранную клавиатуру, safe-area, landscape и swipe-dismiss history drawer.",
      "Chat Runtime 3.0 компактизирует старые turns в bounded structured memory: goals, decisions, constraints, facts и open tasks.",
      "Erma Flow 2.0 разрешает до трёх последовательных read-only tool rounds и сохраняет частичный run при step failure.",
      "Files & Artifact Workspace добавляет bounded TXT/MD/CSV/JSON/PDF ingestion и artifact schema v2 со связями source session/run/document.",
      "Optional Workspace Sync хранит только AES-GCM ciphertext snapshot с revision/checksum; local-first и Workspace Vault остаются стандартом.",
      "PWA & Reliability добавляет явный update prompt и cache namespace v0.19.7 вместо принудительной смены Worker во время активной сессии.",
    ],
    channel: CURRENT_RELEASE_CHANNEL,
    majorUpdate: true,
    codename: CURRENT_RELEASE_CODENAME,
    stability: "beta",
    knownIssues: [
      "PDF ingestion является bounded best-effort extraction: сложные или полностью сжатые PDF без доступного plain text могут быть отклонены.",
      "Workspace Sync выключен, пока на сервере не задан WORKSPACE_SYNC_SECRET и не применена D1 migration 0001_workspace_sync.sql.",
      "Синхронизация snapshot выполняется вручную и не является realtime multi-device collaboration.",
    ],
    migrationNotes: [
      "Перед включением sync примените D1 migration 0001_workspace_sync.sql; существующая таблица users не изменяется деструктивно.",
      "WORKSPACE_SYNC_SECRET должен быть отдельным server-only secret длиной не менее 32 символов; не переиспользуйте Auth/Rate Limit ключи.",
      "Artifact local storage автоматически нормализует старые schema v1 записи в schema v2.",
      "Service Worker cache namespace изменён на tklabs-v0.19.7-workspace-evolution-r1-static.",
    ],
  },
  en: {
    date: "08 Aug 2026",
    version: CURRENT_RELEASE_VERSION,
    title: "WORKSPACE EVOLUTION — Mobile, Memory, Flow, Files & Sync",
    summary: "MAJOR UPDATE · PRE-RELEASE. The v0.19 series turns TK Lab into one coherent workspace with a unified mobile shell, structured long-chat memory, multi-round Erma Flow, documents and artifacts, optional encrypted sync, and controlled PWA updates.",
    changes: [
      "Mobile Shell 2.0 removes duplicated global navigation and adds a direct Chat / Flow / Artifacts / Runs switcher.",
      "Mobile Chat Pro stabilizes VisualViewport, software-keyboard geometry, safe areas, landscape behavior, and swipe-to-dismiss history.",
      "Chat Runtime 3.0 compacts older turns into bounded structured memory: goals, decisions, constraints, facts, and open tasks.",
      "Erma Flow 2.0 allows up to three sequential read-only tool rounds and preserves partial run state on step failure.",
      "Files & Artifact Workspace adds bounded TXT/MD/CSV/JSON/PDF ingestion and artifact schema v2 with source session/run/document links.",
      "Optional Workspace Sync stores only an AES-GCM ciphertext snapshot with revision/checksum while local-first and Workspace Vault remain the default.",
      "PWA & Reliability adds an explicit update prompt and the v0.19.7 cache namespace instead of forcing a new Worker into an active session.",
    ],
    channel: CURRENT_RELEASE_CHANNEL,
    majorUpdate: true,
    codename: CURRENT_RELEASE_CODENAME,
    stability: "beta",
    knownIssues: [
      "PDF ingestion uses bounded best-effort extraction; complex or fully compressed PDFs without exposed plain text can be rejected.",
      "Workspace Sync stays disabled until WORKSPACE_SYNC_SECRET is configured and D1 migration 0001_workspace_sync.sql is applied.",
      "Snapshot sync is manual and is not realtime multi-device collaboration.",
    ],
    migrationNotes: [
      "Apply D1 migration 0001_workspace_sync.sql before enabling sync; the existing users table is not changed destructively.",
      "WORKSPACE_SYNC_SECRET must be a separate server-only secret of at least 32 characters; do not reuse Auth or rate-limit keys.",
      "Artifact local storage automatically normalizes legacy schema v1 records into schema v2.",
      "The Service Worker cache namespace changes to tklabs-v0.19.7-workspace-evolution-r1-static.",
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
