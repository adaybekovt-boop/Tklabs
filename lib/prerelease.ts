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
  codename: "Interface Polish";
  stability: "beta";
  knownIssues: string[];
  migrationNotes: string[];
}

const PREVIEW_RELEASE: Record<Locale, PreviewReleaseNote> = {
  ru: {
    date: "07 авг. 2026",
    version: CURRENT_RELEASE_VERSION,
    title: "INTERFACE POLISH — Corrective UI, Accessibility & Cache Sync",
    summary: "КРУПНОЕ ОБНОВЛЕНИЕ · ПРЕДВАРИТЕЛЬНАЯ ВЕРСИЯ. Проверен внесённый напрямую дизайн, исправлены accessibility и мобильная прокрутка, возвращена прозрачность Patch Notes, а версия приложения и Service Worker-кэш снова синхронизированы.",
    changes: [
      "В истории диалогов восстановлен настоящий accessible heading, поэтому `aria-labelledby` снова указывает на существующий элемент.",
      "Устранён конкурирующий вертикальный scroll container у body; документ снова использует один предсказуемый root scroll owner на iOS и других touch-браузерах.",
      "В Patch Notes возвращены компактные, но полностью видимые блоки известных ограничений и migration notes.",
      "Проверены изменения Erma Flow, Playground, site chrome, Status и Patch Notes, добавленные после v0.16.8.",
      "Удалён неиспользуемый импорт в ConversationArchive и добавлены regression-контракты для accessibility, scroll ownership и release transparency.",
      "Release identity поднят до `v0.16.9 — Interface Polish`.",
      "Service Worker cache namespace поднят до `tklabs-v0.16.9-static`.",
    ],
    channel: CURRENT_RELEASE_CHANNEL,
    majorUpdate: true,
    codename: CURRENT_RELEASE_CODENAME,
    stability: "beta",
    knownIssues: [
      "Cloudflare Git Integration всё ещё может работать параллельно с repository deploy workflow и создавать два последовательных Worker build для одного commit.",
      "Readiness подтверждает runtime bindings и версию Worker, но доступность внешних AI providers по-прежнему проверяется отдельно через Status.",
      "Автоматический rollback после неуспешного production smoke-test не включён.",
    ],
    migrationNotes: [
      "Изменений D1 schema, пользовательских данных и Workspace Vault format нет.",
      "Service Worker cache namespace обновлён до `tklabs-v0.16.9-static`; предыдущий static cache удаляется при активации.",
      "После подтверждения единственного production-контура отключите дублирующий Cloudflare Git Integration либо repository deploy workflow.",
    ],
  },
  en: {
    date: "07 Aug 2026",
    version: CURRENT_RELEASE_VERSION,
    title: "INTERFACE POLISH — Corrective UI, Accessibility & Cache Sync",
    summary: "MAJOR UPDATE · PRE-RELEASE. The directly committed design was reviewed, accessibility and mobile scrolling were corrected, Patch Notes transparency was restored, and application release identity is synchronized with the Service Worker cache again.",
    changes: [
      "Conversation history regains a real accessible heading, so `aria-labelledby` references an existing element again.",
      "The competing body vertical scroll container is removed; the document returns to one predictable root scroll owner on iOS and other touch browsers.",
      "Patch Notes restores compact but complete known-limitations and migration-note panels.",
      "The post-v0.16.8 Erma Flow, Playground, site chrome, Status, and Patch Notes design changes were reviewed.",
      "An unused ConversationArchive import is removed and regression contracts now cover accessibility, scroll ownership, and release transparency.",
      "Release identity is bumped to `v0.16.9 — Interface Polish`.",
      "The Service Worker cache namespace is bumped to `tklabs-v0.16.9-static`.",
    ],
    channel: CURRENT_RELEASE_CHANNEL,
    majorUpdate: true,
    codename: CURRENT_RELEASE_CODENAME,
    stability: "beta",
    knownIssues: [
      "Cloudflare Git Integration may still run beside the repository deployment workflow and create two sequential Worker builds for one commit.",
      "Readiness confirms runtime bindings and Worker release identity, while external AI-provider availability remains a separate Status check.",
      "Automatic rollback after a failed production smoke test is not enabled.",
    ],
    migrationNotes: [
      "There are no D1 schema, user-data, or Workspace Vault format changes.",
      "The Service Worker cache namespace is updated to `tklabs-v0.16.9-static`; the previous static cache is removed on activation.",
      "After confirming one production path, disable either the duplicate Cloudflare Git Integration or the repository deployment workflow.",
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
