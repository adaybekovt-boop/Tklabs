# Terms consent implementation

Version: `2026-08-05`

## Flow

1. An authenticated request renders `StitchHeader`.
2. `TermsGate` calls `GET /api/account/terms` with `no-store` caching.
3. The server reads the signed-in Google session and upserts the account into D1. No browser storage is used for consent.
4. If `terms_accepted` is false, or `terms_version` differs from `CURRENT_TERMS_VERSION`, the gate opens.
5. The user chooses Russian or English, reads the selected edition, checks the acceptance checkbox, and submits the current version.
6. `POST /api/account/terms` validates the same-origin request, session, language, payload size, and exact current version before writing the consent fields.
7. On success, the modal closes. A later request reads the database record and does not show the gate until the version changes.

The gate is intentionally blocking only for a signed-in user whose record requires consent. Public pages and signed-out users remain accessible. If Auth.js or D1 is unavailable, the gate fails closed and keeps the agreement pending; it never grants access from `localStorage` or a cookie. An administrator can review the full agreement at `/admin/terms` without resetting anyone’s consent.

## D1 storage

The Drizzle schema is in `db/schema.ts`; the generated migration is `drizzle/0000_nappy_gunslinger.sql`.

| Column | Type | Purpose |
| --- | --- | --- |
| `id` | text | Stable SHA-256-derived internal identifier based on normalized email |
| `email` | text | Normalized authenticated account email; unique |
| `name` | text | Current provider display name |
| `image` | text | Current provider avatar URL |
| `terms_accepted` | integer / boolean | Whether the user accepted an edition |
| `terms_accepted_at` | integer / timestamp | Time of the last accepted edition |
| `terms_version` | text | Exact edition accepted by the user |
| `language` | text | `ru` or `en` selected at acceptance |
| `created_at` | integer / timestamp | Account record creation time |
| `updated_at` | integer / timestamp | Last account or consent update |

The consent check is `!terms_accepted || terms_version !== CURRENT_TERMS_VERSION`. The version is defined once in `lib/terms.ts` and is sent to the client only as a comparison aid; the server remains authoritative.

## API contract

### `GET /api/account/terms`

Returns `401` for a signed-out request, `503` when authentication or D1 is unavailable, and a no-store JSON status for an authenticated account:

```json
{
  "required": true,
  "accepted": false,
  "currentVersion": "2026-08-05",
  "acceptedVersion": null,
  "acceptedAt": null,
  "language": null
}
```

### `POST /api/account/terms`

Accepts `{ "language": "ru" | "en", "version": "2026-08-05" }`. The route rejects cross-origin requests, oversized JSON, unsupported languages, and stale versions. It returns `409` for a version race and `503` for unavailable consent storage.

## Deployment checklist

1. Use the Cloudflare D1 database named `tklabs` (`7b481442-f635-41f2-ba5d-a62f106c518c` in production).
2. The production database ID is included as a non-secret build fallback so both GitHub Actions and Cloudflare Git integration emit the Worker binding `DB`. Set the optional `D1_DATABASE_ID` override only for another environment.
3. Apply `drizzle/0000_nappy_gunslinger.sql` to the production database using the project’s approved Wrangler/D1 migration process.
4. Deploy and verify an authenticated account with `GET /api/account/terms`.
5. Accept both language variants in staging, confirm the stored timestamp/version, and confirm that a second request returns `required: false`.
6. Change `CURRENT_TERMS_VERSION` only together with reviewed legal text, the Markdown document, and a new migration/release note when storage changes.

The build keeps a production D1 binding even when `D1_DATABASE_ID` is absent, so the consent API does not silently degrade on Cloudflare Git integration builds. A missing or invalid binding still returns `503`; the deployment check and live health verification should catch that configuration error.

## Admin review

`/admin/terms` is protected by `isPrivilegedAiEmail`, the same allowlist used for the existing unlimited founder accounts. It renders both languages from the same runtime source. Opening this page does not change the current user’s database record and does not re-trigger the gate.

## Hidden promo-code field

The Clodex promo field is rendered only after the eligible account activates the explicit “Extended access” trigger. Eligibility is controlled by the server-side `CLODEX_PROMO_EMAILS` environment variable; it is never inferred from local storage or a client-supplied group. The API checks the allowlist again on `POST /api/profile/access`, applies the existing rate limiting, and never exposes the field to ordinary accounts by default.

## Operational notes

- Keep `CURRENT_TERMS_VERSION` immutable for the lifetime of an edition.
- Do not use cookies or `localStorage` as an authority for consent.
- Do not silently accept a new version on behalf of a user.
- Keep legal copy and runtime copy synchronized in the same change review.
- Before launch, replace the template operator/contact/jurisdiction wording with the actual legal details and obtain professional legal review.
