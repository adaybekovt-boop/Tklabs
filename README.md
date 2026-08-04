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
- `GET|POST /api/profile/access` — Clodex entitlement status and redemption.
- `/api/auth/*` — Auth.js Google OAuth endpoints.
- `/playground` — authenticated AI workspace.
- `/models`, `/access`, `/documentation`, `/developers`, `/truth`, `/status` — product and transparency pages.

## Backend safeguards

- Request bodies are bounded before JSON parsing.
- Browser state-changing requests must pass same-origin checks.
- AI prompt and output safety checks run before provider results reach the client.
- NVIDIA keys rotate after quota or rate-limit failures and are never sent to the browser.
- Clodex access, redemption attempts, and request windows are stored in a Cloudflare Durable Object.
- Browser-local archives are sanitized and bounded to prevent malformed data and storage exhaustion from breaking the chat.

## Commands

- `npm run dev` — start the local application.
- `npm run build` — build the Cloudflare Worker.
- `npm test` — build and run backend contract tests.
- `npm run lint` — lint the TypeScript source.
- `npm run db:generate` — generate Drizzle migrations when database-backed features are introduced.

## Deployment

Merges to `main` trigger the Cloudflare Worker deployment workflow. It can also be started manually from GitHub Actions. The workflow builds the Worker, uploads configured secrets, and deploys using the generated Wrangler configuration.
