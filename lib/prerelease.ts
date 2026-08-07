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
    date: "07 авг. 2026",
    version: CURRENT_RELEASE_VERSION,
    title: "RELEASE SAFETY — Architecture, Browser, Security & Deployment Gates",
    summary: "КРУПНОЕ ОБНОВЛЕНИЕ · ПРЕДВАРИТЕЛЬНАЯ ВЕРСИЯ. Серия v0.17 закрывает критические долги lifecycle, архитектуры, browser QA, security, структуры репозитория и безопасного релиза.",
    changes: [
      "Provider timeout и отмена действуют до полного чтения JSON/SSE body; streaming ограничен total/idle timeout и размером.",
      "Demo API и chat request lifecycle разделены на независимо тестируемые request, JSON, stream, state, transport и persistence модули.",
      "Browser Assurance проверяет desktop Chromium, mobile Chromium и mobile WebKit с mocked SSE без реальных provider credentials.",
      "Включён enforcing CSP baseline, строгий Report-Only канал, CSP reporting, Markdown URL sanitizer, secret scan, SBOM и Dependency Review.",
      "Добавлены CODEOWNERS, contribution templates, testing guide, исторический архив и release consistency gate.",
      "Добавлены migration safety, single-writer deployment guard, canary и deliberate rollback workflows с evidence artifacts.",
      "Release identity и Service Worker cache namespace подняты до `v0.17.5 — Release Safety`.",
    ],
    channel: CURRENT_RELEASE_CHANNEL,
    majorUpdate: true,
    codename: CURRENT_RELEASE_CODENAME,
    stability: "beta",
    knownIssues: [
      "Cloudflare Git Integration необходимо отключить вручную; repository code не может изменить owner-only Cloudflare setting.",
      "Строгая CSP без `unsafe-eval` остаётся Report-Only до анализа production violations.",
      "Canary и rollback workflows являются ручными production actions и требуют Cloudflare version IDs.",
    ],
    migrationNotes: [
      "Изменений пользовательских данных и Workspace Vault format нет.",
      "D1 migrations теперь проходят destructive-change guard и должны оставаться совместимыми с предыдущим Worker.",
      "Установите repository variable `TKLABS_DEPLOY_WRITER=github-actions` и отключите Cloudflare Git Integration до production merge.",
      "Service Worker cache namespace обновлён до `tklabs-v0.17.5-static`.",
    ],
  },
  en: {
    date: "07 Aug 2026",
    version: CURRENT_RELEASE_VERSION,
    title: "RELEASE SAFETY — Architecture, Browser, Security & Deployment Gates",
    summary: "MAJOR UPDATE · PRE-RELEASE. The v0.17 series closes critical lifecycle, architecture, browser QA, security, repository structure, and safe-release debt.",
    changes: [
      "Provider timeout and cancellation remain active through complete JSON/SSE consumption; streaming has total, idle, and output limits.",
      "The demo API and chat request lifecycle are split into independently testable request, JSON, stream, state, transport, and persistence modules.",
      "Browser Assurance covers desktop Chromium, mobile Chromium, and mobile WebKit with mocked SSE and no real provider credentials.",
      "An enforcing CSP baseline, stricter Report-Only channel, CSP reporting, Markdown URL sanitizer, secret scan, SBOM, and Dependency Review are added.",
      "CODEOWNERS, contribution templates, a testing guide, historical archive, and release-consistency gate are added.",
      "Migration safety, a single-writer deployment guard, canary workflow, and deliberate rollback workflow retain evidence artifacts.",
      "Release identity and the Service Worker cache namespace are bumped to `v0.17.5 — Release Safety`.",
    ],
    channel: CURRENT_RELEASE_CHANNEL,
    majorUpdate: true,
    codename: CURRENT_RELEASE_CODENAME,
    stability: "beta",
    knownIssues: [
      "Cloudflare Git Integration must be disabled manually; repository code cannot change the owner-only Cloudflare setting.",
      "The stricter CSP without `unsafe-eval` remains Report-Only until production violations are reviewed.",
      "Canary and rollback workflows are manual production actions and require Cloudflare version IDs.",
    ],
    migrationNotes: [
      "There are no user-data or Workspace Vault format changes.",
      "D1 migrations now pass a destructive-change guard and must remain compatible with the previous Worker.",
      "Set repository variable `TKLABS_DEPLOY_WRITER=github-actions` and disable Cloudflare Git Integration before production merge.",
      "The Service Worker cache namespace is updated to `tklabs-v0.17.5-static`.",
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
