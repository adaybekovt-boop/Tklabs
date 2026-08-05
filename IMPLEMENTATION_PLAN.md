# TK Labs production hardening follow-up

## Audit baseline

- Repository: `adaybekovt-boop/Tklabs`
- Baseline: `main` at `3db8c856e117c39d2d25c6168484a0af67e7b913` (PR #23)
- Working branch: `fix/production-hardening-followup`
- Scope: production hardening after PRs #19–#23; preserve the existing TK Labs visual language and working AI routes.
- Delivery: one draft PR, no automatic merge to `main`.

## Findings

- Validation already runs in CI, but the Cloudflare deploy workflow rebuilds and deploys independently and executes only one hardcoded D1 migration.
- Public demo quota is consumed before provider execution and cannot be committed/released idempotently, so provider failures can spend allowance.
- Attachments are validated, but the public prompt budget is only 180 characters and the request path still needs a reservation-safe final-context contract.
- ElevenLabs TTS accepts 10,000 characters and has no durable per-account quota or single-flight guard.
- Durable Object account IDs use unsalted SHA-256 of normalized email addresses, exposing a stable offline identifier.
- Clodex access grants contain only `activated_at`; expiry, revocation and grant-version metadata are absent.
- `/api/status` probes providers on every request and has no stale snapshot fallback.
- Safety heuristics block harmless educational code and describe a stricter policy than the follow-up product requirement.
- PlaygroundChat still owns request, archive, speech and toolbar responsibilities in one 542-line component.
- Existing backend contract tests lean on source-text assertions; behavior tests are needed for the new provider/quota contracts.

## Staged implementation

### P0 — critical correctness and security — completed

- [x] Gate production deployment on the complete validation workflow.
- [x] Apply all D1 migrations through an ordered, idempotent migration runner.
- [x] Add durable TTS length, per-user window, daily character and in-flight reservation controls.
- [x] Add Clodex entitlement metadata, expiry and an admin-only emergency revoke route.
- [x] Replace account object IDs with HMAC-SHA-256 and preserve safe legacy lookup.
- [x] Cache provider health in a shared Durable Object for 60 seconds and serve a bounded stale snapshot after refresh failure.
- [x] Convert public demo consumption to reserve/commit/release with idempotent reservation IDs.
- [x] Raise the public prompt limit to approximately 2,000 characters while retaining attachment and final-context limits.
- [x] Allow harmless educational code while retaining prompt-injection and secret/system-prompt extraction blocks.

### Critical follow-up review — completed locally

- [x] Demo reservation settlement now waits for the actual fallback result: NVIDIA and successful Clodex commit; local fallback, full provider failure, and abort release; output safety is an explicit provider-result decision.
- [x] Account lookup exposes `hasGrant`; any non-empty HMAC object wins over legacy, including expired, revoked, and policy-version-invalid grants.
- [x] Added `POST /api/admin/clodex/revoke` with privileged allowlist authorization, strict target validation, 8 KiB body limit, request ID, no-PII logs, and feature-flag-independent emergency behavior. The old self-revoke URL is inert (410).
- [x] Grant `grant_version` is now the server policy version (`CLODEX_GRANT_VERSION`, default `v2`), never a UUID.
- [x] Demo/TTS reservations have bounded two-minute TTLs, explicit `reserved/committed/released/expired` state, bounded cleanup, and idempotent expiry/refund behavior.
- [x] Status checks moved from an isolate-local cache to a shared `HealthStatus` Durable Object with 60-second TTL, five-minute stale fallback, single-flight refresh, no secret/body output, and Clodex probe gating.
- [x] D1 runner reads the ledger and executes only pending, safely named migrations; failed files are not recorded and reruns are no-ops.
- [x] TTS counts Unicode code points with `Array.from`, honors pre-provider aborts, and enforces public/privileged production quotas with one parallel request and a 2,000-code-point request cap.
- [x] Added behavioral coverage for fallback settlement, account precedence, admin route failure modes, migration ledger logic, health binding contract, and exact TTS policy defaults.

### P1 — backend architecture — completed

- [x] Centralize provider metadata and reservation/error contracts without exposing server model IDs to the client.
- [x] Keep fallback metadata explicit and ensure failed primary providers do not masquerade as the requested model.

### P2 — UI and component refactor — completed

- [x] Extract chat request, conversation archive, speech and toolbar/suggestion responsibilities from PlaygroundChat.
- [x] Preserve UI behavior and remove only misleading states or unsupported promises.

### P3 — tests, CI/CD and documentation — completed

- [x] Add mocked-provider integration behavior tests for demo, Clodex, TTS and status contracts.
- [x] Run the full validation matrix after each stage and at the end.
- [x] Update README, env example, deployment docs, security notes, rollback/runbook and PR documentation.
- [x] Record GitHub settings that require owner/admin action if the API cannot safely change them.

## Validation gates

After each stage, run:

```text
npm ci
npm run typecheck
npm run lint
npm test
npm run build
npm audit --omit=dev --audit-level=high
```

Final follow-up result: `npm ci`, production audit, typecheck, lint, 11 unit tests, 29 integration/contract tests, `npm test`, production build, and `git diff --check` all pass locally. The production dependency audit reported zero vulnerabilities. The integration suite uses a small Cloudflare binding loader and mocked NVIDIA/fake Durable Object providers; it never calls a paid provider or production database. Both GitHub Validate jobs passed. The separate Cloudflare Workers Build check failed on PR #24 (latest observed build `e7985ba1-59a9-4178-84d7-907735c367e2`); its dashboard log requires repository Cloudflare access, so this change does not claim that external failure is fixed.

## Rollback

Rollback is a revert of the draft PR. Durable Object schema changes are additive and retain legacy columns/lookup paths. New D1 migration files are idempotent; do not manually delete production tables. If deployment fails, keep the last known-good Worker and revert the code/config change before retrying.

## Manual GitHub / Cloudflare actions

- Confirm repository default branch is `main`, enable branch protection/required checks, and enable automatic head-branch deletion after merge.
- Configure production secrets and variables listed in `.env.example` in the correct Cloudflare account/Worker and GitHub environment.
- If GitHub Actions is the sole production deploy path, disable the duplicate Cloudflare Git Integration build or align its build command/environment; otherwise investigate its failed `Workers Builds: tkai` check in the Cloudflare dashboard before merge. Do not mark the external check fixed without a successful log.
- Confirm the GitHub deployment account owns the `tklabs.uk` zone and the intended Worker; a local Wrangler account may not have access to that zone.
- Review open PR #8 separately; it is from an earlier architecture and should not be merged without rebasing and re-review.
