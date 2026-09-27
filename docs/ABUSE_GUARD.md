# Request abuse guard

## Application layer

The Worker checks public dynamic requests before routing. Per Cloudflare client address and Cloudflare location, its rate limiting bindings allow up to 120 requests/minute and 30 non-GET/HEAD requests/minute. The expensive POST routes `/api/demo`, `/api/clodex`, `/api/external-api`, and `/api/tts` share a 20 requests/minute address ceiling. After authentication, those routes share a separate 6 requests/minute account ceiling. The key sent to each binding is an HMAC digest; neither the source address nor email is written into the counter key or application logs.

The response is `429` with `Retry-After: 60` and `Cache-Control: no-store`. A missing binding, identity or signing secret in production returns `503` for a protected request, so an unconfigured deployment cannot silently forward paid AI calls. `/api/ready` is exempt from the Worker counters for deployment health checks; the edge rule still covers it. Authentication routes, including OAuth callbacks, use the public traffic ceiling. Static assets do not consume these counters. Existing per-account or per-visitor daily demo limits, provider quotas, Durable Object reservations, TTS character quotas and admission scheduling still apply.

Worker binding counters are local to a Cloudflare location and eventually consistent. These are burst controls, not a precise financial spending limit. An address can also be shared by several legitimate users; the address ceilings are intentionally higher than the account ceiling.

## Edge rule required to avoid Worker invocation costs

Code inside a Worker runs **after** the request has invoked that Worker. To stop a request flood before it consumes Worker invocations, create a zone **Rate limiting rule** in Cloudflare Security rules for `tklabs.uk`:

```text
starts_with(http.request.uri.path, "/api/")
```

Use **IP** as the counting characteristic; **20 requests in 10 seconds**, **Block**, with the longest mitigation duration available for the zone plan. The Free plan documents a 10-second period and 10-second mitigation timeout, while higher plans can offer longer durations. This one rule covers all API routes, including costly model calls, account sync, authentication, and health checks. Confirm the rule's available controls and the observed legitimate request rate in Security Analytics before deploying it. The Worker guard handles slower per-user traffic that stays below this flood threshold.

Keep Workers usage alerts enabled and review 429/503 rates after rollout. Cloudflare's WAF and Worker binding counters can permit a small burst before they converge; neither provides an absolute monthly billing cap.

The Worker binding configuration lives in `vite.config.ts` and is emitted to `dist/server/wrangler.json` by the production build. This configuration also sets `workers_dev: false` so the public `tkai.adaybekovt.workers.dev` route cannot bypass the zone WAF after deployment; Cloudflare preview and version URLs remain available. The WAF rule belongs to the Cloudflare zone configuration; this repository does not provision it. Verify that `tklabs.uk` remains attached as the Worker's custom domain during rollout.
