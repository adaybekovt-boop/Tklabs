# Google OAuth setup

The application uses Auth.js with the Google provider and an encrypted JWT session cookie. Cloudflare D1 stores the authenticated account record and versioned terms consent; chat conversations remain bounded browser-local sessions and are not a server backup. Deployments use the official `wrangler d1 migrations apply --remote` command so pending migration application and each `d1_migrations` ledger write share one D1 execution.

## Google Cloud Console

1. Create or select a Google Cloud project.
2. Configure the OAuth consent screen. Use External if people outside your Google Workspace will sign in. Add test users while the app is in testing.
3. Create OAuth credentials for a Web application.
4. Add these authorized JavaScript origins:

    http://localhost:3000
    https://YOUR_DOMAIN

5. Add these authorized redirect URIs:

    http://localhost:3000/api/auth/callback/google
    https://YOUR_DOMAIN/api/auth/callback/google

The redirect URI must match exactly. Do not add a trailing slash unless it is part of the deployed URL.

## Local environment

Copy .env.example to .env.local and set:

    AUTH_SECRET=...
    AUTH_GOOGLE_ID=...
    AUTH_GOOGLE_SECRET=...
    RATE_LIMIT_SECRET=...
    ACCOUNT_ID_SECRET=...
    TERMS_USER_ID_SECRET=...
    NVIDIA_API_KEY_PRIMARY=...
    NVIDIA_API_KEY_SECONDARY=...
    ELEVENLABS_API_KEY=... (optional high-quality speech)
    ELEVENLABS_VOICE_ID=... (required with the ElevenLabs key)
    ELEVENLABS_MODEL_ID=eleven_multilingual_v2 (optional)
    TTS_REQUEST_LIMIT=5
    TTS_DAILY_CHARACTER_QUOTA=10000
    TTS_PRIVILEGED_REQUEST_LIMIT=30
    TTS_PRIVILEGED_DAILY_CHARACTER_QUOTA=100000

Generate AUTH_SECRET with:

    npx auth secret

Never expose AUTH_GOOGLE_SECRET or AUTH_SECRET as NEXT_PUBLIC variables and never commit .env.local.

## GitHub Actions and Cloudflare

The Validate workflow runs on pushes and pull requests. GitHub Pages is not used because this application has server-side OAuth routes.

The Deploy Cloudflare Worker workflow runs automatically on every push to `main`. It performs its own production check and audit before migration/deploy. Add only these repository secrets:

    CLOUDFLARE_API_TOKEN
    CLOUDFLARE_ACCOUNT_ID

The Cloudflare Worker `tkai` is the source of truth for runtime secrets. Its required secret names are `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `RATE_LIMIT_SECRET`, `ACCOUNT_ID_SECRET`, `TERMS_USER_ID_SECRET`, and `NVIDIA_API_KEY_PRIMARY`. Optional names are `NVIDIA_API_KEY_SECONDARY`, `UNLIMITED_AI_EMAILS`, `ADMIN_EMAILS`, `CLODEX_API_KEY`, `CLODEX_ACCESS_CODE`, `CLODEX_PROMO_EMAILS`, `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`, and `ELEVENLABS_MODEL_ID`. Clodex secrets are required only when `CLODEX_ENABLED=true`; if either ElevenLabs name is present, both API key and voice ID are required.

The deployment preflight runs `npm run cloudflare:check-secrets`, reads only the Cloudflare secret-name list, and fails on missing feature-enabled requirements. `UNLIMITED_AI_EMAILS` is optional and is never required for deployment. It never copies values to GitHub, prints values, or runs `wrangler secret put`.

Set the non-secret Actions variables `AUTH_URL=https://tklabs.uk`, `AUTH_TRUST_HOST=true`, `CLODEX_ENABLED`, `CLODEX_GRANT_TTL_DAYS`, `CLODEX_GRANT_VERSION`, `CLODEX_MODEL_FAST`, `CLODEX_MODEL_REASONING`, `CLODEX_MODEL_PRO`, and the four TTS quota variables only when configuring the Worker. All three Clodex model variables are required and must be valid provider IDs when Clodex is enabled; there are no production fallback IDs. Production defaults are grant version `v2`, public `5` requests/15 minutes and `10000` characters/day, and privileged `30` requests/15 minutes and `100000` characters/day. Do not ship a Worker with `AUTH_URL=http://localhost:3000`. The workflow checks the pushed commit, runs `npm run check` and the production audit, checks Cloudflare secret names, applies only pending D1 migrations with the official Wrangler migration command, and deploys the generated Wrangler configuration without rewriting existing runtime secrets. A custom domain can be attached in Cloudflare later; then add its exact callback URL in Google Cloud Console.

The production deploy is automatic only after a reviewed change reaches `main`: a push to `main` starts `.github/workflows/deploy-cloudflare.yml`, which checks the exact commit, runs the checks and audit, applies pending D1 migrations, and deploys `dist/server/wrangler.json`. Pushing this draft PR or another feature branch does not deploy production. Cloudflare Git Integration must stay disabled if GitHub Actions is the sole deploy path.

Unlimited access is granted only after a valid authenticated session email exactly matches a normalized full address in the optional `UNLIMITED_AI_EMAILS` Cloudflare secret. Domain-only values, wildcards, malformed entries, absent configuration, and unauthenticated requests fail closed. The allowlist is never returned to clients.

Admin actions (`/api/admin/clodex/revoke`, `/admin/terms`) are gated by a separate optional `ADMIN_EMAILS` Cloudflare secret, not `UNLIMITED_AI_EMAILS`. Existing deployments that relied on `UNLIMITED_AI_EMAILS` for admin access must set `ADMIN_EMAILS` explicitly before or during this rollout, or admin routes will fail closed (no one will have admin access) until it is configured.

## Owner checklist

- Set repository default branch to `main`; protect it with the Validate check and prevent direct production pushes.
- Enable automatic deletion of merged head branches.
- Keep only one production deployment pipeline. If GitHub Actions deploys `main`, disconnect Cloudflare Git Integration or make its contract identical and require its check.
- Confirm the GitHub Actions Cloudflare token can deploy the account that owns `tklabs.uk` and the `tkai` Worker.
- Add the exact production OAuth callback `https://tklabs.uk/api/auth/callback/google` in Google Cloud Console.
