# TK Labs v0.9.1 chat UI hotfix

## Root cause

The v0.9.0 Playground nested a full visual-viewport minimum height inside a page that already reserved space for the global header. Desktop parents used `overflow-hidden`, so the composer could be pushed below the visible viewport.

## Fixes

- The chat workspace now uses the height allocated by its flex parent.
- `visualViewport` sizing is restricted to mobile/coarse-pointer layouts and cleaned up on unmount.
- Chat mode no longer renders the normal global site header above the dedicated chat header.
- Chat overlays render through a portal to `document.body`, with Escape handling, focus trapping, focus restoration, and reference-counted body scroll locking.
- The composer has stable dimensions and grows only with text.
- Voice input is a separate action; an empty send action no longer requests microphone permission.
- The composer clears drafts and attachments only after the request layer accepts a submission.
- Secondary Learn, Write, reasoning, and tone controls are collapsed instead of occupying the chat permanently.
- Jump to latest is positioned outside transcript flow.

## Validation

GitHub Validate run #139 passed on commit `ce2636a8eaa39a7f22d15a3a43424a590ca25292`:

- production dependency audit: 0 vulnerabilities;
- typecheck;
- lint;
- 22 unit tests;
- 39 integration/contract tests;
- production build.

A real-device or production-like browser smoke test remains required before merging because automated source and API tests cannot fully reproduce mobile virtual keyboards and browser viewport behavior.
