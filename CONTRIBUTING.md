# Contributing to TK LAB

## Before opening a change

1. Create a focused branch from `main`.
2. Read `IMPLEMENTATION_PLAN.md` and preserve the separation between public UI model data and server provider configuration.
3. Do not commit `.env` files, credentials, access codes, personal e-mail addresses, prompt contents, or generated deployment artifacts.
4. Keep one logical concern per commit and avoid unrelated visual redesigns.

## Local checks

Run the same checks expected by CI:

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run build
npm audit --omit=dev --audit-level=high
```

If a check fails, fix the underlying issue or document an external advisory/configuration blocker. Do not disable a check or add a blanket ignore only to make CI green.

## API and UI changes

- Keep API responses JSON and include a request ID for provider-facing routes.
- Validate the final prompt after attachment expansion before calling an external provider.
- Keep fallback provider/model metadata explicit and do not label local output as a model response.
- Add behavior tests for new validation, routing, access, or security logic.
- Render user and model text as text; do not introduce `dangerouslySetInnerHTML` for untrusted content.
- Preserve keyboard access, visible focus, reduced-motion behavior, and narrow-screen layouts.

## Pull requests

Describe the change under the relevant headings: Security, Architecture, Product honesty, UI, Tests, CI/CD, and Documentation. Include the commands run and any remaining risk. Production merge and deployment require maintainer review; contributors should not merge their own draft PRs.
