# Incident response and publication

TK LAB separates live health from published incident history. `/status` live signals are not converted into historical uptime percentages.

## Publication rule

A public incident entry requires evidence of user-visible impact or a confirmed security/privacy event. Each entry records an immutable incident ID, start/resolution timestamps, severity, affected service classes, a factual summary, and remediation. Unknown timing is labelled unknown rather than estimated.

`lib/incidents.ts` is the append-only public registry. An empty registry means only that no incidents have been published there; it is not a claim that no incidents occurred and is not a 100% uptime claim.

## Security/privacy incident flow

1. Contain the affected route, credential, feature flag, or provider integration.
2. Preserve minimal non-content evidence: request IDs, timestamps, deployment SHA, safe provider/status metadata.
3. Do not copy prompts, attachments, credentials, or hidden reasoning into incident notes unless strictly required and lawfully handled.
4. Determine whether legal/user notification duties apply based on operator and affected jurisdictions.
5. Ship the smallest safe mitigation, validate it, then document root cause and follow-up work.
