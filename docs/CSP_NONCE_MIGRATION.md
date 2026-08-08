# CSP nonce migration status

TK LAB enforces no eval-like scripts, no frames/objects, no inline script attributes, same-origin browser connections, HSTS, and CSP reporting. The current Next/Vinext hydration path still requires inline bootstrap script data, so `script-src 'unsafe-inline'` remains in the enforced policy while a strict `script-src 'self'` policy runs report-only.

Removing `unsafe-inline` without a verified per-request nonce path would turn a security improvement into a production availability regression. The launch gate requires browser evidence before promoting nonce-only CSP from report-only to enforced.

Server-side provider HTTP calls do not require browser CSP allowlisting; therefore `connect-src` is restricted to `'self'` in v0.20.4.
