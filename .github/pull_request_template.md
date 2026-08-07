## Scope

Describe the user-visible and operational change.

## Risk boundaries

- [ ] Authentication and authorization reviewed
- [ ] Provider keys and reasoning remain server-only
- [ ] D1/DO compatibility reviewed
- [ ] Streaming cancellation and quota settlement reviewed
- [ ] Mobile and accessibility impact reviewed

## Validation

Record the exact final HEAD SHA and completed checks:

- [ ] `npm ci`
- [ ] `npm audit --omit=dev --audit-level=high`
- [ ] `npm run check`
- [ ] Browser Assurance when UI behavior changes
- [ ] CodeQL / Dependency Review
- [ ] Wrangler dry-run

## Release evidence

- Release version:
- Service Worker cache namespace:
- Migration plan:
- Rollback target:
- Remaining limitation:
