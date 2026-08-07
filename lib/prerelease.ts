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
    title: "RELIABILITY FOUNDATION — Streaming Lifecycle & Security Baseline",
    summary: "КРУПНОЕ ОБНОВЛЕНИЕ · ПРЕДВАРИТЕЛЬНАЯ ВЕРСИЯ. v0.17.0 закрывает главный долг provider lifecycle: отмена и таймауты теперь действуют до полного завершения ответа, поток ограничен по времени, простоям и размеру, а security-проверки репозитория усилены.",
    changes: [
      "Provider abort scope больше не закрывается после одних HTTP-заголовков: внешний AbortSignal остаётся связанным до полного чтения JSON или SSE body.",
      "Для NVIDIA streaming добавлены отдельные total timeout 120 секунд и idle timeout 20 секунд; зависший upstream принудительно закрывается.",
      "Streaming safety больше не пересканирует весь накопленный ответ на каждом delta: используется ограниченное скользящее окно и отдельный финальный полный контроль.",
      "Максимальный накопленный streaming-ответ ограничен 96 000 символами для защиты памяти Worker.",
      "Fallback metadata теперь различает total timeout, idle timeout и превышение streaming output limit.",
      "Добавлены regression-тесты зависшего provider body, отмены после получения заголовков, idle timeout и очистки abort listeners.",
      "GitHub Actions закреплены на неизменяемые commit SHA; добавлены CodeQL и Dependabot для npm и workflow dependencies.",
      "Добавлена Content-Security-Policy-Report-Only как безопасная стадия перед включением enforcing CSP.",
      "Release identity и Service Worker cache namespace подняты до `v0.17.0 — Reliability Foundation`.",
    ],
    channel: CURRENT_RELEASE_CHANNEL,
    majorUpdate: true,
    codename: CURRENT_RELEASE_CODENAME,
    stability: "beta",
    knownIssues: [
      "Полный browser-level Playwright набор для OAuth, mobile viewport, stop/retry и PWA update запланирован для следующего патча 17.x.",
      "CSP пока работает только в Report-Only режиме; переход в enforcing mode требует проверки production violation reports.",
      "Автоматический rollback после неуспешного production smoke-test ещё не включён.",
    ],
    migrationNotes: [
      "Изменений D1 schema, пользовательских данных, локального архива и Workspace Vault format нет.",
      "Service Worker cache namespace обновлён до `tklabs-v0.17.0-static`; предыдущий static cache удаляется при активации.",
      "Workflow actions закреплены на commit SHA и дальше обновляются через Dependabot PR, а не плавающие major tags.",
    ],
  },
  en: {
    date: "07 Aug 2026",
    version: CURRENT_RELEASE_VERSION,
    title: "RELIABILITY FOUNDATION — Streaming Lifecycle & Security Baseline",
    summary: "MAJOR UPDATE · PRE-RELEASE. v0.17.0 closes the main provider-lifecycle debt: cancellation and timeouts now remain active until the complete response finishes, streams are bounded by duration, inactivity, and size, and repository security checks are strengthened.",
    changes: [
      "The provider abort scope no longer ends after HTTP headers alone: the external AbortSignal stays linked until the JSON or SSE body is fully consumed.",
      "NVIDIA streaming now has a 120-second total timeout and a 20-second idle timeout; a stalled upstream connection is forcefully closed.",
      "Streaming safety no longer rescans the complete accumulated answer for every delta: it uses a bounded rolling window plus one final full evaluation.",
      "Accumulated streaming output is capped at 96,000 characters to protect Worker memory.",
      "Fallback metadata now distinguishes total timeout, idle timeout, and streaming output-limit failures.",
      "Regression tests cover a stalled provider body, cancellation after headers, idle timeout, and abort-listener cleanup.",
      "GitHub Actions are pinned to immutable commit SHAs; CodeQL and Dependabot are added for npm and workflow dependencies.",
      "Content-Security-Policy-Report-Only is added as a safe stage before enforcing CSP.",
      "Release identity and the Service Worker cache namespace are bumped to `v0.17.0 — Reliability Foundation`.",
    ],
    channel: CURRENT_RELEASE_CHANNEL,
    majorUpdate: true,
    codename: CURRENT_RELEASE_CODENAME,
    stability: "beta",
    knownIssues: [
      "The full browser-level Playwright suite for OAuth, mobile viewport, stop/retry, and PWA updates is scheduled for the next 17.x patch.",
      "CSP remains Report-Only; enforcing mode requires review of production violation reports.",
      "Automatic rollback after a failed production smoke test is not enabled yet.",
    ],
    migrationNotes: [
      "There are no D1 schema, user-data, local archive, or Workspace Vault format changes.",
      "The Service Worker cache namespace is updated to `tklabs-v0.17.0-static`; the previous static cache is removed on activation.",
      "Workflow actions are pinned to commit SHAs and will be updated through Dependabot pull requests instead of floating major tags.",
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
