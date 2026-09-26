import { getConfiguredAuthOrigin, getRuntimeAuthEnvironment, type AuthEnvironment } from "./auth-config";

/** Keep host-only PKCE and session cookies on the same origin as the callback. */
export function getAuthCanonicalRedirect(request: Request, environment: AuthEnvironment = getRuntimeAuthEnvironment()) {
  const current = new URL(request.url);
  const path = current.pathname.replace(/\/+$/, "");
  if (path !== "/login" && path !== "/api/auth" && !path.startsWith("/api/auth/")) return null;
  const origin = getConfiguredAuthOrigin(environment);
  if (!origin || current.origin === origin) return null;

  const isRead = request.method === "GET" || request.method === "HEAD";
  // A cross-origin action cannot carry its CSRF cookie or Next server-action
  // Origin safely. Start a new login on the canonical origin instead.
  const target = new URL(isRead ? current.pathname + current.search : "/login", origin);
  return new Response(null, {
    status: isRead ? 307 : 303,
    headers: {
      location: target.href,
      "cache-control": "private, no-store, max-age=0",
      "referrer-policy": "no-referrer",
    },
  });
}

/** Cloudflare terminates TLS; the actual Worker URL is authoritative. */
export function withTrustedForwardedHeaders(request: Request) {
  const url = new URL(request.url);
  const headers = new Headers(request.headers);
  headers.set("host", url.host);
  headers.set("x-forwarded-host", url.host);
  headers.set("x-forwarded-proto", url.protocol.slice(0, -1));
  return new Request(request, { headers });
}
