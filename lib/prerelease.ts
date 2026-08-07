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
  codename: "Resilience Core";
  stability: "beta";
  knownIssues: string[];
  migrationNotes: string[];
}

const PREVIEW_RELEASE: Record<Locale, PreviewReleaseNote> = {
  ru: {
    date: "07 авг. 2026",
    version: CURRENT_RELEASE_VERSION,
    title: "RESILIENCE CORE — Reliability, Readiness & Engineering Ownership",
    summary: "КРУПНОЕ ОБНОВЛЕНИЕ · ПРЕДВАРИТЕЛЬНАЯ ВЕРСИЯ. Обновлены CI и production-проверки, добавлен readiness-контур, усилено восстановление health cache и полностью переработан раздел Developers с ясными зонами инженерной ответственности.",
    changes: [
      "Раздел Developers превращён в страницу engineering ownership: TK отвечает за backend TK Labs, качество релизов и отказоустойчивость, THOMAS TM — за product architecture и AI systems.",
      "Добавлена подробная карта ответственности по Cloudflare Worker, D1, Durable Objects, AI routing, workspace и release system.",
      "Появились route и global error boundaries с безопасным retry без очистки локальных диалогов, артефактов или Workspace Vault.",
      "Добавлен `/api/ready`, который подтверждает активную версию Worker и наличие обязательных DB, Durable Object access и health bindings без раскрытия секретов.",
      "Production deploy теперь проверяет canonical domain через bounded smoke-test с retry/backoff и сверяет фактически развернутую версию.",
      "HealthStatus Durable Object восстанавливается после повреждённого snapshot, повторяет безопасные GET-probes и хранит last-known snapshot до 15 минут для ограниченного stale fallback.",
      "GitHub Actions обновлены с v4 на Node 24-based checkout/setup-node/upload-artifact v6; deprecated experimental loader заменён стабильным register API.",
      "Инфраструктурный аудит зафиксировал параллельный Cloudflare Git Integration как второй deployment writer; после проверки custom workflow внешний auto-deploy необходимо отключить.",
      "Service Worker cache namespace поднят до `tklabs-v0.16.8-static`.",
    ],
    channel: CURRENT_RELEASE_CHANNEL,
    majorUpdate: true,
    codename: CURRENT_RELEASE_CODENAME,
    stability: "beta",
    knownIssues: [
      "Cloudflare Git Integration управляется вне репозитория. Пока она включена одновременно с deploy workflow, возможны два последовательных Worker build для одного commit.",
      "Readiness проверяет обязательные runtime bindings, но не гарантирует доступность каждого внешнего AI provider; состояние providers остаётся на странице Status.",
      "Автоматический rollback после неуспешного smoke-test не включён: workflow останавливается и сохраняет evidence для ручного решения.",
    ],
    migrationNotes: [
      "После подтверждения production deploy отключите Cloudflare Git Integration для tkai и оставьте `.github/workflows/deploy-cloudflare.yml` единственным production writer.",
      "Новых D1 migrations и изменений пользовательских данных нет.",
      "Service Worker cache namespace обновлён до `tklabs-v0.16.8-static`; предыдущие static caches удаляются при активации.",
    ],
  },
  en: {
    date: "07 Aug 2026",
    version: CURRENT_RELEASE_VERSION,
    title: "RESILIENCE CORE — Reliability, Readiness & Engineering Ownership",
    summary: "MAJOR UPDATE · PRE-RELEASE. CI and production verification are refreshed, a readiness path is added, health-cache recovery is hardened, and Developers is rebuilt around clear engineering ownership.",
    changes: [
      "Developers is now an engineering-ownership page: TK owns the TK Labs backend, release quality, and reliability, while THOMAS TM owns product architecture and AI systems.",
      "A detailed ownership map now covers Cloudflare Worker, D1, Durable Objects, AI routing, workspace, and the release system.",
      "Route and global error boundaries provide safe retry without clearing local conversations, artifacts, or Workspace Vault data.",
      "Added `/api/ready` to confirm the active Worker release and required DB, Durable Object access, and health bindings without exposing secrets.",
      "Production deployment now verifies the canonical domain through a bounded retry/backoff smoke test and checks the actual deployed release.",
      "The HealthStatus Durable Object recovers from a corrupt snapshot, retries safe GET probes, and retains a last-known snapshot for up to 15 minutes of bounded stale fallback.",
      "GitHub Actions move from v4 to Node 24-based checkout/setup-node/upload-artifact v6, and the deprecated experimental loader flag is replaced with the stable register API.",
      "The infrastructure audit records Cloudflare Git Integration as a parallel deployment writer; its automatic deploy must be disabled after the custom workflow is verified.",
      "The Service Worker cache namespace is bumped to `tklabs-v0.16.8-static`.",
    ],
    channel: CURRENT_RELEASE_CHANNEL,
    majorUpdate: true,
    codename: CURRENT_RELEASE_CODENAME,
    stability: "beta",
    knownIssues: [
      "Cloudflare Git Integration is configured outside the repository. While it remains enabled beside the deploy workflow, one commit may create two sequential Worker builds.",
      "Readiness verifies required runtime bindings but does not guarantee every external AI provider is available; provider state remains on Status.",
      "Automatic rollback after a failed smoke test is not enabled; the workflow stops and preserves evidence for a deliberate recovery decision.",
    ],
    migrationNotes: [
      "After validating the production deployment, disable Cloudflare Git Integration for tkai and keep `.github/workflows/deploy-cloudflare.yml` as the only production writer.",
      "No new D1 migrations or user-data transformations are included.",
      "The Service Worker cache namespace is updated to `tklabs-v0.16.8-static`; prior static caches are removed on activation.",
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
