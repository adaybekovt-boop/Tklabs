# Workspace Evolution v0.19

This document records the implementation invariants for the v0.19.0–v0.19.7 major cycle.

## Release sequencing

The series is implemented in order: foundation, mobile shell, mobile chat, chat runtime, Erma Flow, files/artifacts, optional sync, then PWA/reliability. The formal package/release identity is bumped only after the final stage is complete.

## Product invariants

- Mobile uses one global navigation model. Public pages rely on AppDock; the AI workspace uses a workspace switcher for Chat, Flow, Artifacts, and Runs.
- Chat input remains local-first and draft-safe. Opening the software keyboard must not replace the composer DOM node or erase input.
- Long-context compaction keeps recent messages verbatim and converts older explicit conversation text into bounded structured memory. Hidden provider reasoning is never persisted into memory.
- Erma Flow remains read-only. Multi-round planning may call only the existing allowlisted tools; shell, arbitrary URLs, filesystem mutation, and account mutation remain unavailable.
- Document ingestion is bounded before content enters model context.
- Artifact persistence remains backward compatible with existing local data.
- Workspace sync is optional and fail-closed. When enabled, server storage contains an encrypted snapshot plus bounded metadata; local workspace data remains the source of truth until a sync operation succeeds.
- Service Worker caching never includes auth, admin, or API responses.

## Validation

The final gate must include typecheck, lint, unit/integration contracts, production build, performance budget, Cloudflare Worker dry-run, CodeQL, Dependency Review, and Browser Assurance before the branch is presented for merge review.
