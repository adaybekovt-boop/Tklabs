# TK Labs resilience model

This document defines the operational ownership, failure boundaries, and production verification path for TK Labs.

## Ownership

### TK — backend, quality, and reliability

TK owns:

- the TK Labs Cloudflare Worker backend;
- D1 and Durable Object bindings;
- authentication, account access, quotas, and server-side policies;
- CI/CD, release gates, cache-version coordination, and production smoke tests;
- provider fallback behavior and recovery paths;
- performance budgets, operational logs, and incident analysis.

### THOMAS TM — product architecture and AI systems

THOMAS TM owns:

- product architecture and workspace flows;
- Erma model behavior, routing direction, and agent workflows;
- information architecture and interface systems;
- functional direction and interaction quality;
- translating AI capabilities into understandable product outcomes.

Shared systems must still have a primary operational owner. Production backend and reliability decisions remain under TK ownership.

## Reliability layers

### 1. Request containment

Provider deadlines cover the complete response-consumption lifecycle, not only the time needed to receive HTTP headers.

`withProviderResponse` keeps one composed abort scope active while JSON is parsed or SSE is read. The scope forwards the route signal, applies a total deadline, optionally applies a stream idle deadline, aborts the upstream connection, and removes timers and listeners when response consumption finishes.

NVIDIA streaming uses a 120-second total deadline and a 20-second idle deadline. Accumulated output is bounded, and streaming safety evaluation uses a rolling window followed by one complete final evaluation. NVIDIA supports key rotation and cooldown for quota or authentication failures. The API can use Clodex or a local safe fallback when the selected route is unavailable.

A provider failure must not:

- erase the user prompt;
- clear the local archive;
- invalidate Workspace Vault data;
- expose provider credentials;
- leave a provider stream running after browser cancellation;
- crash unrelated pages.

### 2. UI recovery

Route failures use `app/error.tsx`. Application-shell failures use `app/global-error.tsx`. Both surfaces provide a deliberate retry and avoid destructive local-storage actions.

### 3. Health and readiness

Health and readiness answer different questions:

- `/api/ready` verifies that this Worker has the required runtime bindings and exposes the active release. It is used by deployment smoke tests.
- `/api/status` reports provider and platform health through the shared `HealthStatus` Durable Object. It can return a clearly marked stale snapshot after a failed live refresh.

Readiness must not call external providers. This keeps deployment verification fast and prevents a provider outage from being mistaken for a broken Worker deployment.

### 4. Shared health snapshot

The `HealthStatus` Durable Object provides single-flight refresh across Worker isolates. Stored JSON is validated before use. Invalid state is removed and rebuilt. Live snapshots last 60 seconds. A last-known snapshot can be served as `source: "stale"` for a maximum of 15 minutes.

### 5. Release evidence

A production release is complete only when all of these refer to the same version:

- `lib/release-version.ts`;
- preview release notes;
- release documentation;
- Service Worker cache namespace;
- `/api/ready` response;
- canonical-domain smoke test.

### 6. Supply-chain evidence

Repository automation is part of the production trust boundary.

- GitHub Actions use immutable commit SHAs.
- CodeQL analyzes JavaScript and TypeScript changes.
- Dependabot opens bounded npm and workflow update pull requests.
- Production dependencies are audited before validation and deployment.
- Runtime secret values remain in Cloudflare; repository automation checks names only.

## Deployment path

1. GitHub Actions validates dependencies, TypeScript, lint, unit tests, integration tests, production build, performance budget, and Wrangler dry-run.
2. CodeQL performs a separate JavaScript and TypeScript security analysis.
3. The production workflow rebuilds from the lockfile and validates required secret names.
4. Pending D1 migrations are applied through the migration runner.
5. Wrangler deploys the generated Worker configuration.
6. `scripts/smoke-test-production.mjs` checks the canonical domain with bounded retries.
7. The smoke test verifies the required bindings, expected release, and manifest.

## Database migration compatibility

Production migrations follow an expand, migrate, contract sequence:

1. **Expand:** add nullable columns, new tables, or compatible indexes without removing fields used by the current Worker.
2. **Migrate:** deploy code that can read old and new state, then backfill incrementally where required.
3. **Contract:** remove legacy fields or assumptions only in a later release after production evidence confirms that no active Worker depends on them.

A migration merged with a Worker release must be backward-compatible with the previous known-good Worker because a deployment can fail after D1 migration succeeds. Destructive schema changes require a separate reviewed release and an explicit rollback plan.

## Single deployment writer

The repository contains an explicit production workflow. Cloudflare Git Integration can also deploy from GitHub and is configured outside the repository. Running both creates ambiguous deployment ordering and rollback ownership.

After v0.16.8 is deployed successfully through `.github/workflows/deploy-cloudflare.yml`, disable automatic Git deployment for the `tkai` Worker in Cloudflare. Keep the repository workflow as the sole production writer.

## Incident sequence

When production verification fails:

1. Do not treat a successful Wrangler command as proof that the canonical domain is healthy.
2. Record the failing release, commit SHA, readiness response, and Cloudflare deployment identifier.
3. Determine whether the failure is binding configuration, application startup, migration, routing, provider timeout, provider idle stall, or another external dependency.
4. Preserve local user data and avoid broad cache deletion unless the cache namespace is confirmed as the cause.
5. Roll back deliberately to the last known good Worker version when required.
6. Confirm that any already-applied D1 migration remains compatible with the rollback target.
7. Add or update a regression contract before retrying the deployment.

Automatic rollback is intentionally not enabled in v0.17.0. A failed smoke test stops the workflow and preserves evidence for a controlled decision.

## Cache policy

The Service Worker stores only static assets and the offline shell. It does not cache API, auth, admin, or navigation responses. Each release that changes client behavior must bump `CACHE_VERSION`; activation removes older TK Labs cache namespaces.
