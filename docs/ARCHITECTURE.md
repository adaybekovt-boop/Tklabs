# TK LAB architecture

Updated against the September 2026 implementation. Historical release documents describe their release, not the current runtime.

## Product boundary

TK LAB is a local-first AI workspace backed by external model providers. Its primary workflow is: sign in, submit a task with relevant context, receive an attributable result, save it, and reopen or export it. Erma is the product identity, not evidence of a separately trained foundation model.

Keep the modular monolith on Cloudflare Workers. D1 stores account/consent records and optional encrypted snapshots. Durable Objects own serialized usage/admission state. Microservices would add deployment and consistency work without addressing the defects found in this audit.

## Current ownership

| Boundary | Owner | Contract |
| --- | --- | --- |
| Request host/geography | `worker/index.ts`, `lib/auth-origin.ts` | Canonical login origin; forwarded headers derive from the actual Worker URL. |
| Session | `auth.ts`, `lib/auth-config.ts`, `lib/auth-http.ts` | Request-time configuration, verified Google email, original Request preserved for Auth.js HTTP handlers. |
| Request preparation | `app/api/demo/request-context.ts` | Origin, body, optional account, context limits, tools and quota admission. |
| Transport | `app/api/demo/route.ts` | Select JSON responder or SSE session; no provider/storage implementation. |
| Generation/delivery | `json-responder.ts`, `stream-session.ts`, `fallback.ts` | Cancellation, safe output, disclosed fallback and quota settlement. |
| Provider adapters | `lib/ai/providers/`, `lib/ai/provider-http.ts` | Typed results; bounded network lifetime/stream buffers; explicit completion. |
| Shared admission | `worker/inference-scheduler.ts` | Lease ownership, bounded final-generation concurrency and health state. |
| Quota/entitlement | `worker/clodex-access.ts`, quota/access helpers | Server authority; idempotent reservation/commit/release. |
| Account records | `lib/terms-consent.ts`, `lib/privacy-server.ts`, `db/` | D1 transactions preserve related records and audit evidence. |
| Snapshot sync | `lib/workspace-sync-server.ts`, client/limits helpers | Manual snapshot, revision compare-and-swap, encryption at rest. |
| Local workspace | Archive, vault and personal-memory modules | Preserve user content; export and erase all owned local data. |
| Flow | `ErmaFlowStudio.tsx`, `lib/flow/stream.ts` | Foreground task/result workflow; explicit terminal status and preserved partial output. |
| Telegram | `telegram-bot/` | Separate deployment, per-user/per-chat history and durable webhook processing. |

## Invariants

1. Client cancellation is not a provider outage. Release its lease without increasing failure counters or starting fallback generation.
2. Network ownership includes parsing and consumption, not just response headers. Consumer errors terminate upstream work. Idle/total duration and buffers are bounded.
3. EOF alone is not success. Require a provider completion marker and valid visible output. Client transports likewise reject an error, partial result or missing terminal event as completion.
4. Hidden reasoning never becomes a browser delta or archived answer. Streaming filters handle tags split across chunks.
5. Quota has one settlement: commit according to delivered-output policy or release when no answer was delivered. Repeated settlement is harmless. Provider admission and user quota are separate resources.
6. Related account/consent writes and success audit evidence commit together. Cryptographic migration uses compare-and-swap and cannot overwrite a newer snapshot.
7. Snapshot limits use UTF-8 bytes and include encryption/base64 overhead. A local archive may exceed the cloud snapshot cap; oversized uploads return 413.
8. Branding applies to authored product copy. Never rewrite a user's message, source code, citation URL or assistant answer in the DOM.
9. Local-first describes storage, not local inference. Manual D1 snapshots are not end-to-end encryption or continuous backup.
10. Readiness checks configuration/bindings, not a successful Google callback, database query or paid-provider generation. Smoke checks canonical provider URLs and CSRF separately.

## Remaining consolidation

The responder and chat transport extractions already exist; the previous document incorrectly listed them as future work. JSON and SSE still duplicate parts of generation/fallback business logic. A shared event-producing executor should own that work; transports should only collect JSON or deliver events.

The scheduler currently covers final generation, while planner/council/direct grounding can call providers independently. A single request-wide deadline and cost/admission accounting remain necessary before claiming a complete global budget.

Other targets: Flow's separate consumer and duplicated public/server capability definitions. Preserve behavior with domain tests before consolidating them. A `verified` source status is a scoped heuristic about evidence availability, not a proof that all generated claims are true.

Consent is enforced by the workspace UI, not the AI API. The demo API also intentionally has an anonymous path. Decide that API product contract explicitly before calling consent a universal server boundary. Local archive/memory storage is scoped to the browser, not the Google account. Audit retention cleanup is opportunistic on writes, not scheduled.

`AGENTS.md` describes an earlier desktop-only overnight task; `IMPLEMENTATION_PLAN.md` mixes older releases. Their historical paths, branches and temporary scope are not a current architecture specification. This audit does not change those files to bypass permissions.

## Evidence

Behavioral tests cover auth exchange, provider cancellation/completion, generated SQLite account queries, revision races, export/erase and transport status. Selected source-contract tests remain, but a regex match cannot prove a login or transaction rollback.

See [the system audit](SYSTEM_AUDIT_2026-09-26.md) for exact validation results and operational gaps. No production capacity, paid-provider latency or retention figures are inferred from these tests.
