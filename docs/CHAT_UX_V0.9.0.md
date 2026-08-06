# TK LAB Chat UX v0.9.0

This release keeps the existing TK LAB visual language and replaces the fragile chat interaction layer with an app-like workspace for narrow and wide screens.

## Interaction contract

- Desktop keyboards: `Enter` submits, `Shift+Enter` inserts a line break, and IME composition is never submitted prematurely.
- Mobile keyboards: `Enter` inserts a line break; the visible send/stop control is the explicit action.
- The composer stays usable while a request is running. The stop action is available inside the composer and in the workspace header.
- Text attachments are validated in the browser and again by the server. Previews are modal sheets with Escape, focus restoration, scroll lock, and safe-area padding.

## Request lifecycle

The client uses `preparing → generating → completed|error|stopped`. Each request owns a request ID, assistant message ID, `AbortController`, and watchdog. A response can update a message only while that request still owns the active slot. `stop`, `new conversation`, component unmount, and `pagehide` abort the active request. The API remains a buffered JSON contract; the UI does not claim that it is streaming.

Errors retain a safe request ID and display fallback provenance, provider/model metadata, and a bounded `Retry-After` countdown when the server supplies one. Prompt text, attachment contents, raw IP addresses, and credentials are not logged.

## Scroll ownership

The transcript owns its own scroll container. New content follows the reader only while they are within the bottom threshold. Reading older messages does not get interrupted; `Jump to latest` returns to the newest content. The transcript uses `role="log"` and a concise live status instead of putting the entire archive in an `aria-live` region. Reduced-motion preferences select instant scroll behavior.

## Rendering and history

Assistant answers use `react-markdown` with `remark-gfm`. Raw HTML is not enabled, links are restricted to safe protocols, and code blocks/tables scroll horizontally instead of widening the page. TTS receives plain answer text. Browser-local history remains bounded and is now served from an in-memory cache with deferred storage writes and a `pagehide` flush; it is not a server backup.

Desktop uses a persistent history sidebar. Mobile uses an accessible history sheet with search and deletion. The archive UI calls the data `Current session`/`Browser sessions` rather than implying server-side persistence.

## Responsive and accessibility details

- The site header is hidden on the Playground mobile route; the chat shell supplies its compact logo, theme, language, history, and session controls.
- Composer and overlay geometry uses dynamic viewport height and safe-area insets instead of fixed bottom offsets.
- Model selection and attachment previews share the overlay behavior: backdrop, Escape, focus trap/restoration, dialog semantics, and scroll lock.
- Tap targets use a minimum 44px control height where the control is action-critical.
- Existing reduced-motion rules are retained and the new transcript avoids unconditional smooth scrolling.

## Validation

The release adds pure tests for scroll ownership and updates route/UI contract tests for the JSON response, mobile model picker, and abort ownership. Local production build output is approximately 4.9 MB total (`dist/`), with approximately 1.4 MB client output after adding the safe Markdown renderer. These are build artifact sizes, not production latency measurements. No production performance numbers are claimed without a controlled browser run against the deployed site.

The repository does not currently carry a Playwright runner. Browser verification should be run against a preview with mocked `/api/demo`, `/api/clodex`, `/api/profile/access`, and `/api/tts` routes before a production rollout; paid providers and production D1 are intentionally out of scope.
