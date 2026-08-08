# Navigation and motion

TK LAB uses one primary public navigation surface: the persistent bottom application dock in `components/site/AppDock.tsx`.

## Navigation model

The dock is rendered by `StitchHeader` on normal public and account pages. It stays fixed to the viewport on phone, tablet, and desktop. The primary destinations are Home, Updates, AI chat, Profile/Login, and More. Secondary destinations live in the More sheet.

The AI chat workspace remains an exception. `StitchHeader` is called with `chatMode`, so the dock is intentionally hidden while the full-height conversation workspace owns the viewport.

Landing and login pages should not add generic “Open chat”, “Start chat”, or “Back home” buttons when the same destination is already available in the dock. Contextual links are still appropriate when they explain a nearby feature, such as model documentation or release details.

## Motion contract

`MotionOrchestrator` owns route intent and route-entry state. Internal same-origin links set `data-route-transition="leaving"` before navigation. A pathname change sets `data-route-transition="entering"` for the entry animation.

`app/navigation-motion.css` animates page content independently from the dock. The dock remains visually anchored while content changes, and its active icon/indicator animates to the new selection. More-sheet entrance and backdrop transitions are defined in the same file.

External links, downloads, modified clicks, hash-only navigation, and links targeting another browsing context do not trigger route-leave animation.

All navigation animation must honor `prefers-reduced-motion: reduce`; content must remain fully usable with motion disabled.

## Accessibility

The dock uses `aria-current="page"` for the active destination. The More sheet is an `aria-modal` dialog, traps keyboard focus while open, closes on Escape/backdrop/back navigation, and restores focus when closed.

Mandatory legal UI always has a higher stacking layer than navigation surfaces. Do not raise the dock or its sheet above `TermsGate`.
