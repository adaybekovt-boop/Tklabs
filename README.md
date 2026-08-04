# TKlab backend

This repository contains only the server-side application: API route handlers,
authentication, model configuration, database access, and the Cloudflare Worker.
There are no pages, React UI components, stylesheets, fonts, images, or other
design assets in the project.

## Local development

1. Run `npm install`.
2. Copy `.env.example` to `.env.local` and configure the required secrets.
3. Run `npm run dev`.

## API routes

- `POST /api/demo` — authenticated Erma model endpoint.
- `POST /api/clodex` — account-gated Clodex model endpoint.
- `/api/auth/*` — Auth.js endpoints with Google OAuth.
- `/api/profile/access` — Clodex entitlement status and redemption.

## Commands

- `npm run dev` — start the local backend.
- `npm run build` — build the Cloudflare Worker.
- `npm test` — verify that the backend builds.
- `npm run lint` — lint the TypeScript source.
- `npm run db:generate` — generate Drizzle migrations.

## Structure

- `app/api/` — HTTP route handlers.
- `auth.ts` — Auth.js configuration.
- `db/` and `drizzle/` — database schema and migrations.
- `lib/` — server-side model and access-control logic.
- `worker/` — Cloudflare Worker entry point and Durable Object.