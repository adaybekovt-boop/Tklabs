# Desktop audit — TK LAB

## Scope and outcome

- Worktree: `C:\Users\tamer\Desktop\TKlab\agent_work-desktop`
- Branch: `agent/desktop-overnight`
- Scope: desktop chat, desktop workspace, history navigation, popovers, and desktop E2E coverage. No worker, API, legal, deployment, or mobile-product layout code was changed.
- Result: desktop chat navigation is client-side and swaps the active transcript without a browser reload; desktop popovers calculate their own viewport-safe geometry; the desktop workspace has a real **Runs** tab.

## Production incident follow-up — 13 August 2026

- Cloudflare Builds showed the `main` release `a7fff01` succeeding. The red build in the dashboard belonged to Dependabot branch `dependabot/npm_and_yarn/development-dependencies-7762d1c3ad`, not to the release.
- The failed bot build stopped during `npm clean-install`: its grouped update selected `react-server-dom-webpack@19.2.8` while the branch still had `react@19.2.6`, producing `ERESOLVE`.
- Cloudflare had a `Deploy non-production branches` trigger with `branch_includes: ["*"]`, so every Dependabot and feature branch consumed a Workers Build and uploaded a Worker version even though previews were disabled. Trigger `2bc46bcb-e61c-4af9-a7cb-349dc870fdc2` was removed through the Cloudflare API. Only the `main` trigger remains.
- There are still two production writers for `main`: Cloudflare Git Integration and `.github/workflows/deploy-cloudflare.yml`. The release produced two 100% deployments less than a minute apart. The broad Git-integration removal was not performed because the API safety review required separate owner approval; the repository contract still recommends GitHub Actions as the sole writer.
- Google accepted the configured origin and exact callback URI and returned to `/api/auth/callback/google`. Worker observability identified the real failure as `InvalidCheck: pkceCodeVerifier value could not be parsed` on active version `8a550609-bbd2-4ff8-86d8-a0969a6ef2ac`.
- The v0.25.0 change had removed the explicit `secret: process.env.AUTH_SECRET?.trim()` passed to `NextAuth`. In the vinext RSC/Worker split this let the sign-in action and callback resolve an inconsistent PKCE sealing context. Explicit runtime-secret wiring was restored in `auth.ts`, with a regression contract in `tests/security-reliability-patch.test.mjs`.
- Incident-fix validation: typecheck passed; lint passed with the same six pre-existing warnings; 22 unit and 289 integration tests passed; production dependency audit found zero vulnerabilities; production build, performance budget, and Wrangler dry-run passed.

## Implemented fixes

### History and active chat

- `PlaygroundChat` now follows the scalar `session` query value rather than a mutable search-params object.
- `ConversationArchive` invokes `onSessionSelect` for an ordinary left click while retaining its `Link` fallback, modifier-click/new-tab behavior, and URL state.
- `useChatRequest.replaceMessages()` aborts an in-flight response, resets request metadata, synchronizes `messagesRef`, and then swaps the visible transcript. A late SSE event from the previous chat can no longer write into the newly selected chat.
- The archive refresh is deferred to a microtask, avoiding a React cross-component state-update warning while a streamed response is persisted.
- A new `data-chat-hydrated` state identifies the point at which the per-session draft has loaded. Browser tests wait for the interactive composer instead of typing into transient SSR markup.

Root cause of the reported “history does not switch” behavior: the URL could change through a `Link`, but the request state and its mutable message reference were not reset as one conversation boundary. The new selection path replaces both synchronously and preserves a normal URL fallback.

### Desktop layout and workspace

- The history rail begins at `md` (768 px) with a 232 px width, then expands to 268 px at `lg`; it no longer appears only at the largest desktop breakpoint.
- Header actions are compact 36 px controls on desktop.
- `Runs` now selects a dedicated `AgentRunPanel`; it is no longer represented as `Flow/Tasks`.
- The unused `HistoryDropdown` was removed after the persistent desktop rail became the single history surface.

### Popovers and keyboard scope

- The composer no longer applies a global important-position override to every menu. This had overridden component-specific popover placement.
- The model selector measures trigger and viewport geometry, bounds its width and height, flips when necessary, and follows `visualViewport` resize/scroll.
- Framer Motion now animates an inner element so it does not overwrite the outer placement transform.
- Model keyboard handling is scoped to the combobox trigger. `Escape`, arrows, Home/End, Enter, and Space work there without a document-level listener capturing keys from the prompt textarea.

### Browser assurance infrastructure

- Added the repository-local `@playwright/test` dependency and desktop regression coverage for history client navigation, popover bounds, keyboard scope, Runs, and widths 768/834/900/1024/1280/1440/1920.
- The Playwright web-server command is now Windows-compatible: the preview environment remains in `webServer.env` rather than Unix-style command-prefix assignments.
- Existing mobile attachment coverage now selects the attachment `+` rather than the model combobox, which also has `aria-expanded`.

## Manual desktop checklist covered by E2E

| Surface | Verified behavior |
| --- | --- |
| History | Switches two saved chats via client navigation; browser reload is not used. |
| Attachment menu | Opens inside the viewport at 1400×650. |
| Model menu | Opens inside the viewport; keyboard navigation stays inside its combobox. |
| Resize | Desktop rail is visible and no horizontal overflow occurs at all required widths. |
| Workspace | Runs is an independently selected tab and panel. |

## Verification

| Command | Result |
| --- | --- |
| `npm run typecheck` | passed |
| `npm run lint` | passed with 6 pre-existing warnings outside this scope |
| `npm test` | 22 unit + 289 integration passed |
| `npm run security:secrets` | passed (463 tracked files) |
| `npm run migration:safety` | passed |
| `npm run trust:policy && npm run trust:check` | passed |
| `npm run release:check` | passed |
| `npm run build` | passed with preview flags disabled for the build process only |
| `npm run perf:budget` | passed; client JS 1314.1/1367.2 KB, gzip 422.5/429.7 KB |
| `playwright test --project=desktop-chromium --workers=1` | 12 passed, 5 mobile-only skipped |
| `playwright test --project=mobile-chromium --workers=1` | 8 passed, 8 skipped, 1 Terms Gate viewport failure outside this scope |
| `playwright test --project=mobile-webkit --workers=1` | 8 passed, 8 skipped, the same Terms Gate viewport failure outside this scope |

## Remaining issue outside desktop scope

The mobile Terms Gate scenario fails in both Chromium and WebKit before any desktop surface is involved: after language selection, `[data-terms-gate-actions]` is below the visual viewport (1011.75 px vs 841 px in Chromium; 925.34 px vs 661 px in WebKit). It is located in the mobile/legal surface and was deliberately left untouched per the assignment boundary. The mobile attachment menu regression test passes in both engines after the selector correction.
