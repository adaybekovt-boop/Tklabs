# TK LAB repository hardening plan

## Audit snapshot

- Repository: `adaybekovt-boop/Tklabs`
- Audit base: `origin/main` at `1b0c976`
- Working branch: `fix/repository-hardening-cleanup`
- GitHub default branch is currently `agent/google-auth-github-actions`, not `main`.
- Repository permissions expose push access but not administration, so default-branch and branch-protection changes may require an owner action.
- Open PR #8 targets `agent/google-auth-github-actions`, is marked conflicting, changes 85 files, and contains a large superseded UI/backend rewrite. It will not be merged by this work. The recommended action is to close it and replace it with this focused PR after review.

## Architecture findings

- The application is a Vinext/Next-style Cloudflare Worker with a Durable Object for account access and demo rate limits.
- D1 is real, not scaffolding: Auth.js terms consent uses Drizzle and the `DB` binding. The D1 schema and migration must remain. The unused `examples/d1` sample can be removed separately.
- `POST /api/demo` and `POST /api/clodex` currently collect provider output and imitate streaming with SSE chunks. They will move to one bounded JSON contract with abortable upstream requests.
- Prompt length is checked before attachment expansion, while attachment helpers silently truncate and slice files. This permits a public request to exceed the intended context policy.
- The public Erma catalog is already mirrored, but server model IDs and persona configuration remain adjacent in `lib/models.ts`; Clodex display entries also expose provider-like IDs.
- Privileged e-mail configuration still contains hardcoded personal addresses in source.
- Public rate limiting hashes a supplied IP with plain SHA-256 and falls back to one shared `anonymous` bucket.
- Clodex and public demo usage currently share one Durable Object request-window table, and `release()` decrements the account window without a reservation ID.
- The status endpoint performs bounded live checks, but the page still renders a static incident history and the response is cacheable. Local chat archives are real browser storage, but the UI labels them simply as “History”.
- Existing tests are mostly source contract checks. The new pure policy/provider helpers will receive behavior tests; route contract coverage will remain for the Worker boundary.

## Delivery stages

### P0 — critical correctness and security

1. Add a shared security-header constant and verify `microphone=(self)` while keeping unused capabilities disabled.
2. Add strict prompt/attachment validation with separate finite public and privileged limits; reject oversize input before provider calls.
3. Replace hardcoded privileged accounts with normalized `UNLIMITED_AI_EMAILS` parsing.
4. Replace plain IP hashing and the `anonymous` fallback with HMAC-SHA-256 buckets and signed, HttpOnly fallback identifiers.
5. Normalize provider response metadata, fallback reasons, request IDs, safe structured logs, timeouts, and a single JSON response contract.

Checks required before P1: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`.

### P1 — backend simplification

1. Split public and server Erma model catalogs; remove unimplemented public capabilities.
2. Split Clodex public aliases from server provider mappings and gate the experimental route with `CLODEX_ENABLED`.
3. Separate Durable Object demo and Clodex windows; add reservation-aware release semantics without removing the used Durable Object.
4. Keep D1/Drizzle because terms consent uses it; remove only the unused `examples/d1` sample and stale references.

Checks required before P2: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`.

### P2 — truthful UI and focused refactor

1. Parse and display actual provider metadata and an explicit fallback notice.
2. Rename browser-local archive UI so it cannot be mistaken for server history.
3. Remove or clearly label static incident history; make status responses `no-store`.
4. Update product/API copy for JSON responses, real capabilities, and Clodex feature flags.
5. Preserve the TK LAB visual language while improving focus states, overflow handling, and mobile model selection.

Checks required before P3: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`.

### P3 — tests, CI/CD, and documentation

1. Add behavior-focused tests for env parsing, HMAC identity, attachment limits, model separation, fallback metadata, and access reservations.
2. Split `test:unit`, `test:integration`, `test`, `build`, and `check` scripts without duplicate production builds.
3. Make CI run install, typecheck, lint, tests, one build, and production dependency audit on `main`, pull requests, and working branches with timeout/concurrency.
4. Make deployment secret validation explicit, separate secrets from public vars, and add new runtime secrets.
5. Update README and implementation docs; add MIT `LICENSE`, `SECURITY.md`, and `CONTRIBUTING.md`.

## Verification and hand-off

The final PR will be a single draft PR with small logical commits. It will not be merged automatically. The final report will list any checks that cannot run because of repository configuration, remaining risks, and the manual GitHub settings required to make `main` the default branch and protect it.

## Implementation status

- P0 and P1 are implemented in commits `954dda1`, `d123b81`, and `173d578`, with the follow-up response/terms hardening in `1b0f689` and `971e174`.
- P2 is implemented: provider metadata and fallback notices are visible, the status page is live-only/no-store, the chat has one JSON contract, the archive is labeled as browser-local sessions, and attachment controls reject rather than silently truncate oversized files.
- P3 is implemented: behavior tests and separated scripts are in `7e2622d`, CI/deploy checks are in `c35304b`, and documentation/security policy are in `7a308f6`.
- The unused `examples/d1` sample was removed in `a05df5d`; the actual D1 layer remains because terms consent uses it.
- The final `npm ci`, full check, production audit, secret scan, push, and draft PR creation remain release-gate tasks. No merge is planned.
