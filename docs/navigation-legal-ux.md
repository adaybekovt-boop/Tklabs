# Navigation and legal UX

## Mobile navigation

Public mobile pages use the persistent bottom navigation as the primary application chrome. The desktop `StitchHeader` remains available at `lg` breakpoints and above; below that breakpoint the top header is intentionally hidden to avoid duplicated navigation controls.

The bottom dock provides Home, Updates, AI chat, Profile/Login, and More. Secondary destinations such as Models, Workspace Vault, Status, Documentation, Team, and Principles remain available from More. The document body reserves safe-area-aware bottom padding while the dock is mounted.

Navigation motion is progressive enhancement. Internal links receive a short exit/entry transition, desktop glow navigation uses the View Transition API when supported, and all motion is disabled under `prefers-reduced-motion: reduce`.

## Entry and sign-in surfaces

The mobile home page does not repeat chat call-to-action buttons because AI chat is already a prominent item in the persistent bottom navigation. Desktop layouts retain contextual calls to action where there is enough space and they do not compete with the primary navigation.

The sign-in page has one primary action: Google authentication. Terms, privacy, and supported-country information are exposed as text links rather than competing buttons.

## Terms gate

Authenticated users must accept `CURRENT_TERMS_VERSION`. The gate is fail-closed:

- If consent storage is unavailable, the gate stays open and offers a retry path.
- If the server reports a different current version than the client bundle knows, the gate stays open and requires a page reload. A stale client must never silently bypass a newer agreement.
- A `409` during acceptance is treated as a version race and also requires a reload.
- The terms gate uses a higher overlay layer than mobile navigation and menus so underlying controls cannot visually cover the agreement.
- Changing the agreement language resets the acceptance checkbox.

The full agreement remains readable at `/legal/terms`; privacy information is at `/legal/privacy` and geography policy is at `/supported-countries`.

## Regression expectations

Changes to navigation or legal consent should preserve:

1. Keyboard and modified-click behavior for normal links.
2. `prefers-reduced-motion` behavior.
3. Safe-area padding on mobile devices.
4. Access to legal pages before sign-in.
5. Fail-closed behavior when the agreement version cannot be proven current.
