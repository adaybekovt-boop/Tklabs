import { Auth } from "@auth/core";

import { getAuthConfig } from "./auth-config";
import { getAuthCanonicalRedirect } from "./auth-origin";

/**
 * Use Auth.js's Web Request handler directly at the Worker HTTP boundary.
 * next-auth's AUTH_URL rewrite passes a Request as NextRequest's init. Vinext
 * 0.0.50 spreads that init, losing prototype-backed headers/method/body. The
 * callback consequently loses its PKCE Cookie header even on the same host.
 * Server actions still use NextAuth; their response cookies are preserved.
 */
export async function handleAuthRequest(request: Request) {
  const redirect = getAuthCanonicalRedirect(request);
  if (redirect) return redirect;
  return Auth(request, getAuthConfig());
}
