# TK LAB

TK LAB is a bilingual AI workspace built around a small, explicit Cloudflare Worker architecture. It provides an authenticated Playground, three honest Erma tiers, optional feature-gated Clodex access, browser voice controls, and a public transparency surface.

## What is real

- Erma Lite, Erma Core, and Erma Pro are the only public Erma modes. Their provider mappings and system prompts stay server-side.
- AI routes return one JSON contract: `{ answer, meta }`. The metadata identifies the requested model, actual provider/model, request ID, latency, status, and any fallback reason.
- Provider reasoning is evaluated transiently on the server and is never returned, rendered, archived, logged, or sent to analytics. The client may receive only the generic `meta.reasoningUsed` boolean.
- Fallbacks are visible. A local fallback is labeled `local-fallback`; it is never presented as NVIDIA, Clodex, or the selected Erma model.
- Chat sessions are bounded browser-local archives. They are not a server-side conversation backup.
- Voice input uses the browser Web Speech API when available. Authenticated ElevenLabs speech is optional; its key and voice configuration never reach the client.
- `/status` reads a shared Durable Object snapshot with a 60-second live TTL and a five-minute stale window. It does not claim a historical uptime percentage or fabricate incident history.

## Stack and architecture

- Next-style React application compiled by Vinext and deployed as a Cloudflare Worker.
- Cloudflare Durable Objects with SQLite for Clodex entitlement, redemption attempts, reservation-aware usage windows, and HMAC-derived public demo buckets.
- Cloudflare D1 with Drizzle for authenticated account records and versioned terms consent.
- Auth.js with Google OAuth for account sessions.
- NVIDIA Build API for the primary Erma route; optional Clodex and ElevenLabs integrations are server-only.
- Tailwind CSS, shared theme tokens, and a bilingual editorial UI.

The main responsibilities are separated into:

- `app/api/` — request validation, authentication, rate limiting, and response contracts.
- `lib/ai/` — provider HTTP timeouts, provider adapters, safe metadata, logging, and fallback results.
- `lib/models/public.ts` — safe UI catalog.
- `lib/models/server.ts` and `lib/models/clodex-server.ts` — server-only provider IDs and routing configuration.
- `worker/` — Durable Object implementation and Worker entry point.
- `db/` and `drizzle/` — the D1 schema and migration used by terms consent.
- `components/playground/` — stable UI composition for the chat toolbar, suggestions, messages, and composer.
- `hooks/` — chat request lifecycle, browser-local archive identity, and speech/TTS fallback logic.

## Local development

Requirements: Node.js 22.13 or newer and npm.

1. Install locked dependencies:

   ```bash
   npm ci
   ```

2. Copy `.env.example` to `.env.local` and add local values. Never commit `.env.local`.
3. Start the local Worker:

   ```bash
   npm run dev
   ```

The Playground page requires a signed-in account. The `/api/demo` endpoint has a bounded public route, but the product UI keeps the workspace behind authentication. If Auth.js or D1 is unavailable, terms consent fails closed rather than being granted from browser storage.

## Routes

- `POST /api/demo` — bounded Erma route with same-origin checks, attachment limits, HMAC-derived demo buckets, provider fallback metadata, and JSON responses.
- `POST /api/clodex` — optional authenticated Clodex route; returns 404 while `CLODEX_ENABLED` is not `true`.
- `GET|POST /api/profile/access` — feature-gated Clodex status and redemption.
- `POST /api/admin/clodex/revoke` — privileged admin revoke for a normalized target email; it remains available while Clodex is disabled so emergency revocation cannot be blocked by the feature flag.
- `POST /api/clodex/revoke` — retired legacy URL; returns 410 and never revokes access.
- `POST /api/tts` — authenticated ElevenLabs speech proxy; the browser speech API is the fallback.
- `GET|POST /api/account/terms` — D1-backed, versioned agreement status and acceptance.
- `GET /api/status` — safe, no-store shared health snapshot; it never calls an AI generation endpoint and probes Clodex only when enabled.
- `/api/auth/*` — Auth.js Google OAuth endpoints.
- `/playground` — authenticated AI workspace with browser-local session archive.
- `/models`, `/access`, `/documentation`, `/developers`, `/patch-notes`, `/truth`, `/status` — product and transparency pages.

### AI response contract

```json
{
  "answer": "Generated text",
  "meta": {
    "requestId": "request-id",
    "requestedModel": "Erma Core",
    "actualProvider": "nvidia",
    "actualModel": "server-side-provider-id",
    "latencyMs": 842,
    "httpStatus": 200
  }
}
```

On provider failure, `meta.fallbackReason` is present and the UI tells the user that a reserve mode was used. Error responses also include a request ID and a stable error code where relevant.

## Limits and security boundaries

- Public prompt: 2,000 Unicode characters; privileged prompt: 16,000 Unicode characters.
- Maximum three `.txt`/`.md` attachments.
- Public attachment: 16 KiB per file and 8,000 Unicode characters of combined context.
- Privileged attachment: 64 KiB per file and 32,000 Unicode characters of combined context.
- The final provider prompt is validated before any external provider call. Oversize input returns 400 or 413; it is not silently truncated.
- Public demo usage uses an idempotent Durable Object reserve/commit/release window; provider failure releases the reservation.
- ElevenLabs text is limited to 2,000 Unicode code points, one in-flight request per account, 5 requests per 15 minutes, and 10,000 characters per day for public users. Privileged accounts use 30 requests per 15 minutes and 100,000 characters per day. Failed, expired, or aborted audio streams release their reservation.
- Demo and TTS reservations expire after two minutes; cleanup refunds expired reservations atomically and retains only a bounded history.
- Clodex grants use the server-side `CLODEX_GRANT_VERSION` policy (default `v2`). A grant with an old, revoked, or expired version is not resurrected through the legacy object-name lookup.
- HMAC-SHA-256 uses `RATE_LIMIT_SECRET` for public buckets, the separate `ACCOUNT_ID_SECRET` for account object IDs, and the separate `TERMS_USER_ID_SECRET` for D1 `users` row IDs; raw IP addresses and e-mail addresses are not stored as identifiers or logged.
- Only `cf-connecting-ip` on a Cloudflare request is considered as an IP signal. Arbitrary `x-forwarded-for` values are ignored. Non-Cloudflare anonymous clients receive a signed HttpOnly fallback cookie.
- Provider keys, OAuth credentials, access codes, model IDs, and system prompts are server-only.
- User text is rendered as text, not injected as HTML, and user code is never executed by the application.
- Regex safety checks are only a heuristic layer. Authentication, allowlists, body/prompt/attachment limits, origin checks, timeouts, and safe output handling are the actual boundaries.

## Environment variables

See [`.env.example`](.env.example) for the complete list.

Required for production:

- `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `RATE_LIMIT_SECRET`, `ACCOUNT_ID_SECRET`, `TERMS_USER_ID_SECRET`, and `NVIDIA_API_KEY_PRIMARY` as Cloudflare Worker secrets.
- `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as the only GitHub Actions secrets. Runtime secrets are not copied from GitHub during deployment.

Provider and feature configuration:

- `NVIDIA_API_KEY_PRIMARY`, optional `NVIDIA_API_KEY_SECONDARY`
- `UNLIMITED_AI_EMAILS`, an optional comma-separated server-side allowlist of complete email addresses; entries are trimmed/lowercased, malformed lists fail closed, and unset means no privileged accounts
- `ADMIN_EMAILS`, a separate optional comma-separated allowlist for administrator actions (`/api/admin/clodex/revoke`, `/admin/terms`); it is deliberately not the same list as `UNLIMITED_AI_EMAILS` so that unlimited AI usage never implies admin power over other accounts, and it follows the same normalize/fail-closed rules
- `CLODEX_ENABLED=true|false`
- `CLODEX_GRANT_TTL_DAYS` is a bounded non-secret variable (default 30 days) for newly redeemed grants.
- `CLODEX_GRANT_VERSION` is a bounded non-secret policy version (default `v2`); changing it intentionally invalidates grants from older policies.
- `CLODEX_MODEL_FAST`, `CLODEX_MODEL_REASONING`, and `CLODEX_MODEL_PRO` are non-secret provider model IDs. They must all be valid and present as Actions variables when `CLODEX_ENABLED=true`; the runtime fails closed instead of silently substituting an undocumented model.
- `TTS_REQUEST_LIMIT`, `TTS_DAILY_CHARACTER_QUOTA`, `TTS_PRIVILEGED_REQUEST_LIMIT`, and `TTS_PRIVILEGED_DAILY_CHARACTER_QUOTA` are bounded non-secret quota variables with production defaults of `5`, `10000`, `30`, and `100000`.
- `CLODEX_API_KEY`, `CLODEX_ACCESS_CODE`, and `CLODEX_PROMO_EMAILS` only when the Clodex experiment is enabled
- `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`, and optional `ELEVENLABS_MODEL_ID`
- `AUTH_URL` is a public origin variable, not a secret; production is `https://tklabs.uk`
- `AUTH_TRUST_HOST=true` is a public Auth.js/Cloudflare variable emitted into the Worker configuration and passed explicitly by production deployment
- `D1_DATABASE_ID` is an optional routing-ID override, not a credential
- `TKLABS_LOCAL_PREVIEW` and `NEXT_PUBLIC_TKLABS_LOCAL_PREVIEW` are development-only preview switches. Production builds fail if either is enabled, and they never bypass production authentication.

## Commands

- `npm run dev` — local development server.
- `npm run typecheck` — TypeScript validation.
- `npm run lint` — ESLint.
- `npm run test:unit` — behavior tests for policy and pure helpers.
- `npm run test:integration` — Worker/API contract tests.
- `npm test` — unit and integration tests.
- `npm run build` — one production Worker build.
- `npm run check` — typecheck, lint, tests, and build.
- `npm run db:generate` — generate a reviewed Drizzle migration when the D1 schema changes.
- `npm run db:migrate` — validate the ordered `drizzle/*.sql` files and invoke the official `wrangler d1 migrations apply tklabs --remote` flow. Wrangler selects only pending files and writes its `d1_migrations` ledger row in the same D1 execution as each migration.
- `npm run cloudflare:check-secrets` — query Cloudflare for secret names only and validate feature-gated runtime requirements; it never prints secret values.

## Cloudflare deployment

The [Validate workflow](.github/workflows/ci.yml) runs on pull requests and branches. [The deployment workflow](.github/workflows/deploy-cloudflare.yml) runs automatically on every push to `main` and validates the production commit before deploying. A draft or feature-branch push intentionally does not deploy production. After the reviewed PR is merged, the resulting `main` push is the automatic production trigger. It:

1. installs the lockfile with `npm ci`;
2. verifies Cloudflare deployment credentials;
3. runs the complete `npm run check` plus production dependency audit;
4. validates Cloudflare runtime secret names without copying or rewriting their values;
5. validates and applies only pending D1 migrations through the official `wrangler d1 migrations apply` command. Each migration and its `d1_migrations` ledger insert are one execution; a failed migration is not marked applied;
6. deploys the generated Wrangler configuration while explicitly managing non-secret production variables.

Public values such as `AUTH_URL`, `CLODEX_ENABLED`, `CLODEX_GRANT_VERSION`, and TTS quota values are Wrangler vars. API keys, HMAC keys, OAuth secrets, access codes, and allowlists are runtime secrets.

When Clodex is enabled, set the three `CLODEX_MODEL_*` values as non-secret GitHub Actions variables. They are injected into the generated Worker config; they are not sent with `wrangler secret put` and are not exposed by the public model catalog.

Cloudflare is the source of truth for runtime Worker secrets. The deployment preflight checks only their names. GitHub Actions stores only the Cloudflare deployment credentials and never runs `wrangler secret put` for application secrets.

## Terms, privacy, and access

- [User Agreement](docs/USER_AGREEMENT.md) contains Russian and English legal text.
- [Terms implementation](docs/TERMS_CONSENT_IMPLEMENTATION.md) documents D1 storage, versioning, API flow, and admin review.
- [AUTH_SETUP.md](AUTH_SETUP.md) documents Google OAuth configuration.
- `terms_accepted`, `terms_accepted_at`, `terms_version`, and `language` are stored in D1. Consent is never authorized by `localStorage` or cookies.
- The hidden Clodex promo field is controlled by the server-side `CLODEX_PROMO_EMAILS` allowlist and the feature flag.
- Account Durable Objects retain a legacy SHA-256 lookup path during migration, but all new account IDs use HMAC-SHA-256 with `ACCOUNT_ID_SECRET`.
- D1 `users` row IDs use HMAC-SHA-256 with `TERMS_USER_ID_SECRET`; rows are looked up by the unique `email` column, so rows created before this migration are backfilled to the HMAC id opportunistically instead of needing a dual-lookup path.

## Contributing and security

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a change. Security reports belong in [SECURITY.md](SECURITY.md); do not publish secrets or sensitive account data in issues.

The project is licensed under the MIT License. See [LICENSE](LICENSE).

## Operational notes

The Cloudflare account used by GitHub Actions must own the `tklabs.uk` zone and the intended Worker. A successful deploy to a different `workers.dev` account does not make the custom domain healthy. Verify the account ID, Worker route/custom domain, D1 binding, OAuth callback URI, and runtime secrets together before diagnosing an AI or login failure.

## Owner-only repository settings

The code cannot safely change repository administration settings. Before production use, the owner should set `main` as the default branch, require the `Validate / check` status on pull requests, restrict direct pushes, enable automatic deletion of merged head branches, and keep the PR workflow in review until required checks are green. Cloudflare Git Integration should remain disconnected when GitHub Actions is the production deploy path; otherwise two systems can deploy different Worker versions.
