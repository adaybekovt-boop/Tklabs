# Navigation and motion

TK LAB uses one primary public navigation surface: the persistent bottom application dock in `components/site/AppDock.tsx`.

## Navigation model

The dock is rendered by `StitchHeader` on normal public and account pages. It stays fixed to the viewport on phone, tablet, and desktop. The primary destinations are Home, Updates, AI chat, Profile/Login, and More. Secondary destinations live in the More sheet.

The AI chat workspace remains an exception. `StitchHeader` is called with `chatMode`, so the dock is intentionally hidden while the full-height conversation workspace owns the viewport.

Landing and login pages should not add generic “Open chat”, “Start chat”, or “Back home” buttons when the same destination is already available in the dock. Contextual links are still appropriate when they explain a nearby feature, such as model documentation or release details.

The cinematic Erma homepage is an explicit product-entry exception: its primary
**Open Erma** CTA links to `/playground`, retaining that route's existing login
gate. `HomeHeader` replaces the floating desktop navigation on this page only;
`StitchHeader` still renders AppDock and TermsGate. Other pages are unchanged.

## Motion contract

`MotionOrchestrator` owns route intent and route-entry state. Internal same-origin links set `data-route-transition="leaving"` before navigation. A pathname change sets `data-route-transition="entering"` for the entry animation.

`app/navigation-motion.css` animates page content independently from the dock. The dock remains visually anchored while content changes, and its active icon/indicator animates to the new selection. More-sheet entrance and backdrop transitions are defined in the same file.

External links, downloads, modified clicks, hash-only navigation, and links targeting another browsing context do not trigger route-leave animation.

All navigation animation must honor `prefers-reduced-motion: reduce`; content must remain fully usable with motion disabled.

## Homepage film ownership

`[data-home-motion]` is excluded from generic MotionOrchestrator reveals and
spatial route transitions. `useHomeFilm` owns its single native-scroll timeline.
It enables a CSS sticky stage only at 600px/600px or larger and with motion
allowed. Geometry is cached on resize/font readiness; one demand-driven RAF
settles progress and then stops. All listeners, frames, observers, inline styles,
and inert states are cleared on unmount, locale change, or a media-query change.
Smaller screens use unpinned scroll entrances; reduced motion and no-JS get the complete
sequential document. `home.css` overrides body overflow only while the home shell
exists, avoiding the app's nested scroll container capturing sticky positioning.

The homepage uses shared monochrome light/dark tokens and the stored theme preference. See PRODUCT.md, DESIGN.md, and docs/HOME_SHOT_LIST.md for its
content evidence, composition and timing contract.

## Accessibility

The dock uses `aria-current="page"` for the active destination. The More sheet is an `aria-modal` dialog, traps keyboard focus while open, closes on Escape/backdrop/back navigation, and restores focus when closed.

Mandatory legal UI always has a higher stacking layer than navigation surfaces. Do not raise the dock or its sheet above `TermsGate`.
