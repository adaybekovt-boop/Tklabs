# Workspace browser v1

The Playground now uses one mounted chat runtime. The history rail, transcript, composer and contextual canvas share a session; task submission and file revision use the same authenticated request path, provider policy, quota handling and archive owner. On mobile, the three-goal dock opens a focus-trapped panel without remounting the conversation.

| Area | Implemented behavior | Boundary |
| --- | --- | --- |
| 1. Navigation | Chat, Tasks and Files lead into the same workspace; Activity and Context live in the canvas. | Existing routes remain. |
| 2. Layout | Conversation remains mounted; desktop canvas is resizable, narrow viewports use a sheet. | Width 310–580px; browser viewport below 1100px uses the sheet. |
| 3. Conversation | Existing archive, projects, search, branching, voice, model choice and attachments remain in chat. | One active request per conversation. |
| 4. Tasks | Task prompt submits through the chat executor and opens its saved output as a file on completion. | No independent background scheduler. |
| 5. Activity | Client run records link to exact session and assistant message IDs, show status and observed tool traces. | Legacy Flow runs remain read-only in the same history. |
| 6. Stream | The demo SSE emits named 2.1 run, tool and answer events alongside legacy frames. | Non-streaming Clodex responses still produce a client-side run with final metadata. |
| 7. Integrity | Sequence and run ID checks reject stale events; terminal outcomes and request ownership stop late writes. | A page reload marks unfinished local runs interrupted. |
| 8. Tools | Started and completed events cover existing read-only tools; results are bounded. | No general browser automation or arbitrary external tool execution. |
| 9. Sources | Existing provider tool links and grounded citations remain attached to answer metadata. | Activity renders only sources received from the runtime. |
| 10. Files | Task output creates a local artifact; preview, edit, versions, restore, duplicate and download are available. | Content cap 200,000 characters and existing artifact count bounds apply. |
| 11. Revision | A file is attached as untrusted context, and a complete revision is saved with a prior version. | Optimistic content check prevents overwriting a concurrent manual edit. |
| 12. Privacy | Run and file data follow local/ephemeral mode; Vault and manual Sync include the run key. | Sync is server-stored, encrypted at rest, not end-to-end encryption. |
| 13. Safety | Existing server origin, auth, rate, quota, attachment and output policies remain in force. | Provider fallback is labelled and does not become a saved task file. |
| 14. Accessibility | Tabs, labelled controls, keyboard resizing, focus trap, Escape and reduced motion are supported. | Browser-level screen reader review is still recommended. |
| 15. Validation | Typecheck, lint, unit/integration tests, build and performance budget run locally. | No live provider invocation or deployment in this branch. |

The implementation keeps the project's TK visual system and language support. It does not assert planning steps when no planner emitted them; “using tools” means only that actual tool events can follow. The code intentionally does not expose hidden reasoning or fabricate web results.
