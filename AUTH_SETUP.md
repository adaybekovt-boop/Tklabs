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

The Deploy Cloudflare Worker workflow runs only after the matching `Validate` workflow succeeds for a push to `main`. Add these repository secrets before enabling production deployment:

    CLOUDFLARE_API_TOKEN
    CLOUDFLARE_ACCOUNT_ID
    AUTH_SECRET
    AUTH_GOOGLE_ID
    AUTH_GOOGLE_SECRET
    RATE_LIMIT_SECRET (required HMAC key for public demo buckets)
    ACCOUNT_ID_SECRET (required separate HMAC key for account Durable Object IDs)
    NVIDIA_API_KEY_PRIMARY (required for Erma)
    NVIDIA_API_KEY_SECONDARY (optional rotation key)
    UNLIMITED_AI_EMAILS (optional comma-separated server-side allowlist)
    CLODEX_API_KEY (only when the `CLODEX_ENABLED` Actions variable is `true`)
    CLODEX_ACCESS_CODE (only when Clodex is enabled; keep the actual code private)
    CLODEX_PROMO_EMAILS (optional comma-separated server-side allowlist)
    ELEVENLABS_API_KEY (optional high-quality speech)
    ELEVENLABS_VOICE_ID (required with the ElevenLabs key)
    ELEVENLABS_MODEL_ID (optional; defaults to eleven_multilingual_v2)

Set the non-secret Actions variables `CLODEX_ENABLED`, `CLODEX_GRANT_TTL_DAYS`, `CLODEX_GRANT_VERSION`, and the four TTS quota variables only when configuring the Worker. Production defaults are grant version `v2`, public `5` requests/15 minutes and `10000` characters/day, and privileged `30` requests/15 minutes and `100000` characters/day. `AUTH_URL` is a public Wrangler variable and should match the canonical site origin. The production workflow sets it to `https://tklabs.uk`; do not ship a Worker with `AUTH_URL=http://localhost:3000`. If `AUTH_URL` is omitted, Auth.js uses the trusted forwarded request host instead of assuming localhost. The workflow validates the exact commit, downloads its validated Worker artifact, validates and applies only pending D1 migrations with the official Wrangler migration command, uploads runtime secrets to Cloudflare, and deploys the generated Wrangler configuration. A custom domain can be attached in Cloudflare later; then add its exact callback URL in Google Cloud Console.
