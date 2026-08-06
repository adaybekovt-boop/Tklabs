# v0.13.0 — True Chat and Streaming

## Request flow

1. The browser selects completed, non-error `user` and `assistant` messages from the current local conversation.
2. The server validates the current prompt and attachments independently from the history.
3. `buildChatContext` normalizes history, removes unsupported roles and error messages, and keeps the newest turns inside explicit public or privileged limits.
4. NVIDIA receives one system message, the bounded history, and the current user prompt.
5. The NVIDIA endpoint uses upstream SSE when called through `/api/demo/stream`.
6. Provider output and hidden reasoning are collected and evaluated server-side before any answer text is exposed publicly.
7. The browser receives typed `start`, `delta`, `meta`, `done`, or `error` SSE events.

## Security boundary

- Raw provider reasoning is never included in the public event schema.
- History cannot introduce system or tool roles.
- Error responses and empty messages are excluded from context.
- Public and privileged context limits are separate.
- Existing origin validation, authentication, prompt limits, attachment limits, safety checks, quota reservation, provider fallback, and no-store response rules remain active.
- The legacy `/api/demo` JSON route remains compatible for existing integrations.

## Context policy

Current v0.13.0 limits are intentionally conservative:

- maximum 24 historical messages;
- maximum 16,000 characters per historical message;
- maximum 24,000 historical characters for public users;
- maximum 96,000 historical characters for privileged users.

The newest valid turns are retained. A selected context never begins with an orphan assistant response.

## Streaming policy

NVIDIA streaming reduces provider buffering and enables request cancellation. Public answer deltas are released only after the complete answer passes output and reasoning safety evaluation. This preserves the existing safety boundary instead of exposing unvalidated provider tokens.

## Known scope

- Direct Clodex selection remains on its existing JSON response route in v0.13.0.
- Clodex fallback receives bounded multi-turn context.
- Automatic tokenization and long-conversation summarization are planned follow-ups; this release uses bounded Unicode character limits.
- No paid production-provider request is executed by CI.
