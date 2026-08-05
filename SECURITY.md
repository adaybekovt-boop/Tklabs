# Security policy

## Reporting a vulnerability

Please do not open a public issue for a suspected vulnerability. Send a private report to the repository maintainers through the GitHub security advisory flow, or use the private contact published by the project owner.

Include:

- a short description and affected route or component;
- reproducible steps or a minimal proof of concept;
- impact and any required account or deployment configuration;
- a safe contact channel for follow-up.

Do not include real OAuth credentials, provider keys, access codes, private user data, raw IP addresses, or production prompt/attachment contents in a report.

## Scope notes

The project treats the following as security boundaries: server-only secrets, Auth.js session checks, same-origin validation, HMAC-derived rate-limit buckets, bounded request bodies and attachments, finite Durable Object windows, provider timeouts, safe text rendering, and no execution of user-supplied code.

The AI safety regexes are heuristics, not a complete security boundary. Reports should describe the actual impact, such as secret exposure, authentication bypass, cross-account access, limit bypass, unsafe rendering, or infrastructure compromise.

## Response expectations

Maintainers will acknowledge a private report when practical, validate the impact, and coordinate a fix or mitigation before public disclosure. Please allow time for provider, Cloudflare, or OAuth configuration changes when the issue depends on external infrastructure.
