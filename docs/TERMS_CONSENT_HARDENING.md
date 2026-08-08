# Terms consent hardening

This note supplements `TERMS_CONSENT_IMPLEMENTATION.md` with the client-side failure rules used by `TermsGate`.

## Version skew

The terms API returns the current server-side terms version. The browser bundle also contains `CURRENT_TERMS_VERSION`. If those values differ, the client must fail closed: the mandatory consent dialog stays open, the checkbox is reset, and the user is prompted to retry/refresh rather than being allowed through with a stale agreement bundle.

This protects the rollout window where a new Worker/API version is live while an older browser asset or service-worker cache is still present.

A `409` response while accepting terms is treated the same way because it indicates that the version submitted by the browser is no longer current.

## Availability failures

A failed consent-status request remains fail closed. The dialog stays visible and offers the existing retry path. The terms status and acceptance endpoints remain `no-store`.

## Stacking order

Mandatory terms consent must render above normal navigation and bottom sheets. The application dock uses layers up to `z-[160]`; `TermsGate` uses `z-[220]`.

Do not lower the legal gate below navigation overlays. A user must never be able to interact with the application while mandatory consent is unresolved.
