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
  codename: "Workspace Vault";
  stability: "beta";
  knownIssues: string[];
  migrationNotes: string[];
}

const PREVIEW_RELEASE: Record<Locale, PreviewReleaseNote> = {
  ru: {
    date: "07 авг. 2026",
    version: CURRENT_RELEASE_VERSION,
    title: "WORKSPACE VAULT — Local Backup & Restore",
    summary: "КРУПНОЕ ОБНОВЛЕНИЕ · ПРЕДВАРИТЕЛЬНАЯ ВЕРСИЯ. Добавлен локальный центр резервного копирования всех рабочих данных с SHA-256 проверкой, безопасным импортом и полной переносимостью между устройствами без загрузки содержимого на сервер.",
    changes: [
      "Добавлена отдельная страница Workspace Vault со сводкой диалогов, черновиков, артефактов, Flow runs, настроек и общего размера локальных данных.",
      "Все поддерживаемые рабочие данные можно скачать одним проверяемым JSON-файлом прямо из браузера.",
      "Каждый экспорт получает SHA-256 digest; импорт отклоняется при повреждении, ручном изменении содержимого или неподдерживаемой структуре.",
      "Импорт поддерживает два явных режима: merge обновляет только ключи из файла, replace сначала удаляет поддерживаемые локальные данные и затем восстанавливает Vault.",
      "Полная замена и объединение требуют повторного подтверждения, а размер файла и отдельных записей ограничен до записи в localStorage.",
      "Workspace Vault доступен из мобильного drawer чата и footer; данные не отправляются в API и обрабатываются только на текущем устройстве.",
      "Сохранены Safe Prompt Branches из v0.16.5, Erma Flow, Agent Runs, Artifact Studio, проекты и версии ответов.",
    ],
    channel: CURRENT_RELEASE_CHANNEL,
    majorUpdate: true,
    codename: CURRENT_RELEASE_CODENAME,
    stability: "beta",
    knownIssues: [
      "Workspace Vault переносит только локальные рабочие данные TK LAB и не экспортирует серверную сессию входа, cookies авторизации или закрытые токены.",
      "Файл резервной копии может содержать полный текст диалогов и материалов; пользователь должен хранить его как приватный документ.",
      "Облачная синхронизация и автоматические периодические резервные копии в этом релизе не добавлены.",
    ],
    migrationNotes: [
      "Существующие диалоги, ветки, черновики, артефакты, Flow runs и настройки не изменяются автоматически.",
      "Vault schema начинается с версии 1 и принимает только заранее разрешённые localStorage keys и prefix черновиков.",
      "Service Worker cache namespace обновлён до `tklabs-v0.16.6-static`, поэтому устаревшие assets удаляются при активации.",
    ],
  },
  en: {
    date: "07 Aug 2026",
    version: CURRENT_RELEASE_VERSION,
    title: "WORKSPACE VAULT — Local Backup & Restore",
    summary: "MAJOR UPDATE · PRE-RELEASE. Added a local backup center for all workspace data with SHA-256 verification, safe import modes, and device-to-device portability without uploading the contents to a server.",
    changes: [
      "Added a dedicated Workspace Vault page summarizing conversations, drafts, artifacts, Flow runs, settings, and total local data size.",
      "All supported workspace data can be downloaded as one verifiable JSON file directly from the browser.",
      "Every export receives a SHA-256 digest; damaged, modified, oversized, or structurally unsupported imports are rejected.",
      "Import supports two explicit modes: merge updates only keys present in the file, while replace clears supported workspace data before restoration.",
      "Merge and replace require a second confirmation, and both file size and individual entries are bounded before localStorage writes.",
      "Workspace Vault is linked from the mobile chat drawer and site footer; data is processed only on the current device and never sent to an API.",
      "Safe Prompt Branches from v0.16.5, Erma Flow, Agent Runs, Artifact Studio, projects, and response versions remain available.",
    ],
    channel: CURRENT_RELEASE_CHANNEL,
    majorUpdate: true,
    codename: CURRENT_RELEASE_CODENAME,
    stability: "beta",
    knownIssues: [
      "Workspace Vault exports only TK LAB local workspace data and never includes server login sessions, authentication cookies, or private tokens.",
      "The backup may contain the full text of conversations and materials and should be stored as a private document.",
      "Cloud synchronization and automatic scheduled backups are not included in this release.",
    ],
    migrationNotes: [
      "Existing conversations, branches, drafts, artifacts, Flow runs, and settings are not changed automatically.",
      "Vault schema starts at version 1 and accepts only an explicit localStorage key allowlist plus the chat-draft prefix.",
      "The Service Worker cache namespace is updated to `tklabs-v0.16.6-static`, removing outdated assets on activation.",
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
