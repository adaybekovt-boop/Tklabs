# TK LAB v0.20 — Trust Architecture

The v0.20 cycle turns privacy, legal truth, AI transparency, and operational governance into product architecture rather than static copy.

## Release chain

1. `v0.20.0` — Product Truth Foundation
2. `v0.20.1` — Legal Center 2.0
3. `v0.20.2` — Privacy Control Center
4. `v0.20.3` — Privacy Modes
5. `v0.20.4` — Security & Crypto v2
6. `v0.20.5` — Unified Policy Engine
7. `v0.20.6` — AI Transparency & Provenance
8. `v0.20.7` — Trust UX & Mobile Control Center
9. `v0.20.8` — Operations & Governance
10. `v0.20.9` — Launch Quality Gate

## Invariants

- Local-first is the default storage posture.
- `Local` and `Ephemeral` never imply that AI requests remain on-device; generation requires an explicit provider route.
- Server Workspace Sync is optional and encrypted at rest, not described as end-to-end encryption.
- Legal acceptance is versioned and auditable; a stale browser must never bypass a material legal update.
- User-facing data controls must distinguish browser-local deletion from server deletion.
- Runtime policy and public Acceptable Use copy are generated from the same policy taxonomy.
- Hidden reasoning, system prompts, provider credentials, and private routing configuration never become public provenance metadata.
- Security boundaries are backed by tests, not only documentation.
- Every v0.20 stage receives an Updates entry; the final release identity is `v0.20.9`.
