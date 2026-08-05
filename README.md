# TK LAB

TK LAB is a Cloudflare-hosted AI laboratory with a bilingual editorial interface, authenticated Playground, Erma model catalog, account-gated Clodex access, and browser-local conversation archive.

## Local development

1. Run `npm ci`.
2. Copy `.env.example` to `.env.local` and configure the required secrets.
3. Run `npm run dev`.

The Playground requires a signed-in account. Conversation history is intentionally kept in the current browser; it is not a server backup.

## Routes

- `POST /api/demo` — public Erma route with Durable Object-backed IP limits.
- `POST /api/clodex` — authenticated, account-gated Clodex route.
- `POST /api/tts` — authenticated ElevenLabs speech route with browser-speech fallback when unconfigured.
- `GET|POST /api/profile/access` — Clodex entitlement status and redemption.
- `GET|POST /api/account/terms` — D1-backed versioned agreement status and acceptance.
- `GET /api/status` — live configuration and provider health checks with bounded timeouts.
- `/api/auth/*` — Auth.js Google OAuth endpoints.
- `/playground` — authenticated AI workspace.
- `/models`, `/access`, `/documentation`, `/developers`, `/patch-notes`, `/truth`, `/status` — product, release, and transparency pages.

## Backend safeguards

- Request bodies are bounded before JSON parsing.
- Browser state-changing requests must pass same-origin checks.
- AI prompt and output safety checks run before provider results reach the client.
- NVIDIA keys rotate after quota or rate-limit failures and are never sent to the browser.
- Clodex access, redemption attempts, and request windows are stored in a Cloudflare Durable Object.
- Account identity and agreement consent are stored in Cloudflare D1; consent is never inferred from browser storage.
- Browser-local archives are sanitized and bounded to prevent malformed data and storage exhaustion from breaking the chat.

## Commands

- `npm run dev` — start the local application.
- `npm run build` — build the Cloudflare Worker.
- `npm test` — build and run backend contract tests.
- `npm run lint` — lint the TypeScript source.
- `npm run db:generate` — generate Drizzle migrations when database-backed features are introduced.

Agreement storage and deployment details are documented in [`docs/TERMS_CONSENT_IMPLEMENTATION.md`](docs/TERMS_CONSENT_IMPLEMENTATION.md). The legal text is in [`docs/USER_AGREEMENT.md`](docs/USER_AGREEMENT.md).

## Deployment

Merges to `main` trigger the Cloudflare Worker deployment workflow. It can also be started manually from GitHub Actions. The workflow builds the Worker with the production D1 binding, applies the idempotent account schema, uploads configured secrets, and deploys using the generated Wrangler configuration. `D1_DATABASE_ID` remains an optional override for another environment.
