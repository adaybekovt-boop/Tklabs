# TK LAB Architecture Boundaries

This document defines the boundaries that keep TK LAB maintainable while the Erma Nova workspace grows.

## Core rule

Route handlers orchestrate. They do not own provider implementations, quota storage, identity derivation, response formatting, or UI state.

## Demo AI request flow

`app/api/demo/route.ts` owns only the request sequence:

1. establish a request ID and origin boundary;
2. parse and normalize the request contract;
3. resolve optional authentication and privilege;
4. validate prompt, attachments, context, and safety;
5. acquire a quota reservation;
6. select JSON or SSE delivery;
7. coordinate generation, fallback, metadata, and settlement.

The details live in focused modules:

- `contracts.ts` — untrusted request shape and normalization;
- `http.ts` — safe JSON responses and validation error mapping;
- `quota.ts` — reserve/commit/release lifecycle and rate-limit responses;
- `fallback.ts` — provider fallback policy, context metadata, and failure classification;
- `route.ts` — orchestration only.

## Quota invariant

Every public AI request has at most one settlement transition:

- `pending -> committed` after a provider produced billable output;
- `pending -> released` when no provider output was delivered;
- repeated commit or release calls are no-ops.

Privileged sessions use the same interface with a no-op quota implementation. This prevents privileged and public paths from diverging inside generation code.

## Provider invariant

Provider adapters return normalized generation results. A route must not expose provider reasoning, private prompts, keys, or unlabelled fallback output. Provider-specific fallback configuration stays outside the route.

`withProviderResponse` owns provider network lifetime. Its timeout and external-abort scope remains active until JSON parsing or stream reading is complete. Provider adapters must not return a raw `Response` whose body outlives that scope.

## Streaming invariant

SSE delivery owns its controller, removes abort listeners when closed, and settles quota based on whether any answer content reached the client. Partial output is preserved and explicitly labelled in metadata.

Upstream provider streams are separately bounded by total duration, idle duration, and accumulated answer size. Incremental safety checks operate on a bounded rolling window; the complete answer receives one final evaluation.

## Architecture budgets

Automated tests enforce the following initial budget:

- `app/api/demo/route.ts` must remain at or below 450 lines;
- the route must not directly import rate-limit persistence or Clodex fallback configuration;
- request normalization, HTTP mapping, quota settlement, and fallback policy must remain independently testable;
- provider adapters must consume response bodies inside `withProviderResponse`;
- streamed answer accumulation and per-delta safety work must remain bounded.

Budgets should tighten as orchestration is extracted further. Raising a budget requires an architectural reason in the pull request, not only a new feature.

## Completed in v0.17.0

- provider timeout and abort ownership now covers complete body consumption;
- NVIDIA JSON, NVIDIA tool planning, Clodex JSON, and NVIDIA SSE use the same lifecycle boundary;
- NVIDIA SSE has total, idle, and output-size limits;
- per-delta safety scanning no longer rebuilds and evaluates the complete accumulated answer;
- regression tests cover lifecycle timeout, cancellation, idle stall, cleanup, and bounded accumulation.

## Next extraction targets

The next safe refactoring sequence is:

1. extract JSON generation into a dedicated responder;
2. extract demo SSE lifecycle into a stream session object;
3. split `hooks/use-chat-request.ts` into transport, reducer, and persistence hooks;
4. split large translation and release catalogs by domain;
5. add browser-level Playwright coverage for login, chat, stop/retry, archive restore, locale, mobile viewport, and PWA update;
6. reorganize version-named regression files into durable domain suites after equivalent coverage is established.
