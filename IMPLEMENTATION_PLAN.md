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
- [x] D1 deployment now delegates pending-file selection and the `d1_migrations` ledger to official `wrangler d1 migrations apply --remote`; the migration SQL and ledger insert execute together, failed files are not marked applied, and a repeat with no pending files is a no-op.
- [x] TTS counts Unicode code points with `Array.from`, honors pre-provider aborts, and enforces public/privileged production quotas with one parallel request and a 2,000-code-point request cap.
- [x] Added behavioral coverage for fallback settlement, account precedence, admin route failure modes, framework-compatible route signatures, TTS retry windows, official migration delegation, health binding contract, and exact TTS policy defaults.
- [x] Made Cloudflare the runtime-secret source of truth, removed GitHub runtime-secret duplication, and added a name-only feature-aware preflight before D1/deploy.
- [x] Added explicit production `AUTH_TRUST_HOST=true` workflow/config wiring and hardened the server-only unlimited-access allowlist to normalized exact full-email matching with fail-closed malformed input.
- [x] Made the Cloudflare deployment workflow push-triggered on `main` with its own production check/audit, so it does not depend on the repository default branch for `workflow_run` events.

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

Final follow-up result: local `npm ci`, production audit, typecheck, lint, 21 unit tests, 39 integration/contract tests, `npm test`, production build with `AUTH_URL=https://tklabs.uk` and `AUTH_TRUST_HOST=true`, `wrangler deploy --dry-run`, generated config checks, and `git diff --check` pass. The production dependency audit reports zero vulnerabilities. The integration suite uses a small Cloudflare binding loader and mocked NVIDIA/fake Durable Object providers; it never calls a paid provider or production database. Cloudflare build `0b43d7c8-7270-4a7e-b060-65b0309637a0` first failed with API error `10181` because the generated `DB` binding used stale database ID `7b481442-f635-41f2-ba5d-a62f106c518c`. After switching to the verified live `tklabs` database `c4085a86-0fec-49f2-b2ed-5999190fcc30`, build `9160d75a-23d9-435a-a4c3-e8242626f372` built and packaged successfully but the duplicate Cloudflare Git Integration failed with API error `10211`: its version upload cannot apply the Worker’s Durable Object migration. Git Integration was then disconnected in the dashboard; GitHub Actions remains the sole production deployment path. The deployment workflow now runs on direct `main` pushes and validates/builds its own commit, avoiding reliance on the repository default branch for `workflow_run`. The current PR #28 head passed GitHub Validate twice and Cloudflare Workers Build `4285c7ab-8858-4ad7-8eee-72c2565d2cf9`. The name-only Cloudflare secret preflight is covered by unit tests; the local Wrangler token is authenticated to a different Cloudflare account, so target-account verification remains a deployment-owner action.

## Rollback

Rollback is a revert of the draft PR. Durable Object schema changes are additive and retain legacy columns/lookup paths. New D1 migration files are idempotent; do not manually delete production tables. If deployment fails, keep the last known-good Worker and revert the code/config change before retrying.

## PR #28 final review follow-up

- [x] Keep provider reasoning transient: evaluate it server-side, strip tagged blocks and reasoning-only responses, and expose only `answer`, `meta`, and the generic `reasoningUsed` flag.
- [x] Restrict local preview switches to development and fail production builds when either preview flag is enabled.
- [x] Make request cleanup ownership-aware so an aborted request cannot clear a newer chat generation.
- [x] Make reasoning opt-in through the explicit request flag; response-effort selection no longer enables hidden provider reasoning.
- [x] Centralize Clodex provider model IDs, budgets, environment keys, and validation for direct routing, fallback routing, health, and tests.
- [x] Separate profile role, unlimited-AI entitlement, Clodex state, and account availability; membership cards are presentational and never grant access.
- [x] Mask the normalized Cloudflare API token before exporting it to GitHub Actions environment state.
- [x] Add HSTS, COOP, `X-Content-Type-Options`, Referrer-Policy, and restrictive Permissions-Policy headers.
- [x] Document automatic deployment after a push to `main`, single-pipeline ownership, branch protection, and remaining owner-only Cloudflare/GitHub actions.

## Manual GitHub / Cloudflare actions

- Confirm repository default branch is `main`, enable branch protection/required checks, and enable automatic head-branch deletion after merge.
- Configure production secrets and variables listed in `.env.example` in the correct Cloudflare account/Worker and GitHub environment. The inspected Worker currently has `AUTH_URL=http://localhost:3000` and no dashboard build variables; set the production value to `https://tklabs.uk` or disable the duplicate Git Integration deployment path.
- The inspected Cloudflare Git Integration used repository root `/`, Node.js `24.18.0`, `npm run build`, and `npx wrangler versions upload`; it had production branch `main`, non-production builds enabled, and no build variables. It is now disconnected so it cannot compete with the GitHub Actions contract or attempt a version upload containing Durable Object migrations.
- GitHub Actions is now the sole production deploy path. The historical Cloudflare check may remain visible as failed for the old builds, but it is disabled rather than treated as a passing deployment signal.
- Ensure the Cloudflare Worker runtime contains the required HMAC/provider secrets, including `RATE_LIMIT_SECRET` and `ACCOUNT_ID_SECRET`; secret values must be entered manually and are not stored in this repository.
- Verify GitHub repository-level Actions secret names contain only `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`; the current local `gh secret list` returned no repository-level names, so this remains an owner action.
- Confirm the GitHub deployment account owns the `tklabs.uk` zone and the intended Worker; a local Wrangler account may not have access to that zone.
- Review open PR #8 separately; it is from an earlier architecture and should not be merged without rebasing and re-review.
