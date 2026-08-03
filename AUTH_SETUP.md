# Google OAuth setup

The application uses Auth.js with the Google provider and an encrypted JWT session cookie. The first version does not require a database; chat history remains session-local and is not persisted.

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
    NVIDIA_API_KEY_PRIMARY=...
    NVIDIA_API_KEY_SECONDARY=...

Generate AUTH_SECRET with:

    npx auth secret

Never expose AUTH_GOOGLE_SECRET or AUTH_SECRET as NEXT_PUBLIC variables and never commit .env.local.

## GitHub Actions and Cloudflare

The Validate workflow runs on pushes and pull requests. GitHub Pages is not used because this application has server-side OAuth routes.

The Deploy Cloudflare Worker workflow is manual. Add these repository secrets before running it:

    CLOUDFLARE_API_TOKEN
    CLOUDFLARE_ACCOUNT_ID
    AUTH_SECRET
    AUTH_GOOGLE_ID
    AUTH_GOOGLE_SECRET
    CLODEX_API_KEY (optional)
    NVIDIA_API_KEY_PRIMARY (recommended)
    NVIDIA_API_KEY_SECONDARY (recommended)

The workflow builds the Vinext Worker, uploads runtime secrets to Cloudflare, and deploys the generated Worker configuration. A custom domain can be attached in Cloudflare later; then add its exact callback URL in Google Cloud Console.
