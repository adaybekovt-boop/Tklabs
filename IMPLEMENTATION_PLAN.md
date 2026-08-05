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
- [x] Add Clodex entitlement metadata, expiry and authenticated self-revoke support.
- [x] Replace account object IDs with HMAC-SHA-256 and preserve safe legacy lookup.
- [x] Cache provider health for 60 seconds and serve a bounded stale snapshot after refresh failure.
- [x] Convert public demo consumption to reserve/commit/release with idempotent reservation IDs.
- [x] Raise the public prompt limit to approximately 2,000 characters while retaining attachment and final-context limits.
- [x] Allow harmless educational code while retaining prompt-injection and secret/system-prompt extraction blocks.

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

Final local result: all checks passed, including 10 unit tests and 22 integration/contract tests. The production dependency audit reported zero vulnerabilities. The integration suite uses a small Cloudflare binding loader and mocked NVIDIA/fake Durable Object providers; it never calls a paid provider or production database.

## Rollback

Rollback is a revert of the draft PR. Durable Object schema changes are additive and retain legacy columns/lookup paths. New D1 migration files are idempotent; do not manually delete production tables. If deployment fails, keep the last known-good Worker and revert the code/config change before retrying.

## Manual GitHub / Cloudflare actions

- Confirm repository default branch is `main`, enable branch protection/required checks, and enable automatic head-branch deletion after merge.
- Configure production secrets and variables listed in `.env.example` in the correct Cloudflare account/Worker and GitHub environment.
- Confirm the GitHub deployment account owns the `tklabs.uk` zone and the intended Worker; a local Wrangler account may not have access to that zone.
- Review open PR #8 separately; it is from an earlier architecture and should not be merged without rebasing and re-review.
