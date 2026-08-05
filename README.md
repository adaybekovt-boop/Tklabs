# TK LAB

TK LAB is a bilingual AI workspace built around a small, explicit Cloudflare Worker architecture. It provides an authenticated Playground, three honest Erma tiers, optional feature-gated Clodex access, browser voice controls, and a public transparency surface.

## What is real

- Erma Lite, Erma Core, and Erma Pro are the only public Erma modes. Their provider mappings and system prompts stay server-side.
- AI routes return one JSON contract: `{ answer, meta }`. The metadata identifies the requested model, actual provider/model, request ID, latency, status, and any fallback reason.
- Fallbacks are visible. A local fallback is labeled `local-fallback`; it is never presented as NVIDIA, Clodex, or the selected Erma model.
- Chat sessions are bounded browser-local archives. They are not a server-side conversation backup.
- Voice input uses the browser Web Speech API when available. Authenticated ElevenLabs speech is optional; its key and voice configuration never reach the client.
- `/status` performs bounded live configuration/provider checks. It does not claim a historical uptime percentage or fabricate incident history.

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
- `components/playground/` — chat orchestration, composer, messages, and browser-local sessions.

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
- `POST /api/tts` — authenticated ElevenLabs speech proxy; the browser speech API is the fallback.
- `GET|POST /api/account/terms` — D1-backed, versioned agreement status and acceptance.
- `GET /api/status` — safe, no-store live checks; it never calls an AI generation endpoint.
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

- Public prompt: 180 Unicode characters; privileged prompt: 16,000 Unicode characters.
- Maximum three `.txt`/`.md` attachments.
- Public attachment: 16 KiB per file and 8,000 Unicode characters of combined context.
- Privileged attachment: 64 KiB per file and 32,000 Unicode characters of combined context.
- The final provider prompt is validated before any external provider call. Oversize input returns 400 or 413; it is not silently truncated.
- Public demo usage uses a finite Durable Object window. HMAC-SHA-256 uses `RATE_LIMIT_SECRET`; raw IP addresses are not stored or logged.
- Only `cf-connecting-ip` on a Cloudflare request is considered as an IP signal. Arbitrary `x-forwarded-for` values are ignored. Non-Cloudflare anonymous clients receive a signed HttpOnly fallback cookie.
- Provider keys, OAuth credentials, access codes, model IDs, and system prompts are server-only.
- User text is rendered as text, not injected as HTML, and user code is never executed by the application.
- Regex safety checks are only a heuristic layer. Authentication, allowlists, body/prompt/attachment limits, origin checks, timeouts, and safe output handling are the actual boundaries.

## Environment variables

See [`.env.example`](.env.example) for the complete list.

Required for production:

- `AUTH_SECRET`
- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`
- `RATE_LIMIT_SECRET`
- `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in GitHub Actions

Provider and feature configuration:

- `NVIDIA_API_KEY_PRIMARY`, optional `NVIDIA_API_KEY_SECONDARY`
- `UNLIMITED_AI_EMAILS`, a comma-separated server-side allowlist; unset means no privileged accounts
- `CLODEX_ENABLED=true|false`
- `CLODEX_API_KEY`, `CLODEX_ACCESS_CODE`, and `CLODEX_PROMO_EMAILS` only when the Clodex experiment is enabled
- `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`, and optional `ELEVENLABS_MODEL_ID`
- `AUTH_URL` is a public origin variable, not a secret
- `D1_DATABASE_ID` is an optional routing-ID override, not a credential

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

## Cloudflare deployment

Pushes to `main` run [the deployment workflow](.github/workflows/deploy-cloudflare.yml). It:

1. installs the lockfile with `npm ci`;
2. builds the Worker once;
3. verifies mandatory production secrets;
4. uploads only runtime secrets with `wrangler secret put`;
5. applies the idempotent D1 migration;
6. deploys the generated Wrangler configuration.

Public values such as `AUTH_URL` and `CLODEX_ENABLED` are Wrangler vars. API keys, HMAC keys, OAuth secrets, access codes, and allowlists are runtime secrets.

## Terms, privacy, and access

- [User Agreement](docs/USER_AGREEMENT.md) contains Russian and English legal text.
- [Terms implementation](docs/TERMS_CONSENT_IMPLEMENTATION.md) documents D1 storage, versioning, API flow, and admin review.
- [AUTH_SETUP.md](AUTH_SETUP.md) documents Google OAuth configuration.
- `terms_accepted`, `terms_accepted_at`, `terms_version`, and `language` are stored in D1. Consent is never authorized by `localStorage` or cookies.
- The hidden Clodex promo field is controlled by the server-side `CLODEX_PROMO_EMAILS` allowlist and the feature flag.

## Contributing and security

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a change. Security reports belong in [SECURITY.md](SECURITY.md); do not publish secrets or sensitive account data in issues.

The project is licensed under the MIT License. See [LICENSE](LICENSE).
