import NextAuth from "next-auth";

import { getAuthConfig } from "@/lib/auth-config";
import { handleAuthRequest } from "@/lib/auth-http";
import { isLocalPreviewEnabled } from "@/lib/local-preview";

// Both server actions and callbacks resolve the same explicit runtime config.
// Do not capture secrets/providers while the RSC module graph is imported.
const nextAuth = NextAuth(() => getAuthConfig());

export const handlers = { GET: handleAuthRequest, POST: handleAuthRequest };
export const signIn = nextAuth.signIn;
export const signOut = nextAuth.signOut;

export const auth = (async (...args: Parameters<typeof nextAuth.auth>) => {
  if (process.env.NODE_ENV === "development" && isLocalPreviewEnabled()) {
    return {
      user: {
        id: "local-dev-user",
        name: "TK Labs Local Dev",
        email: "dev@tklabs.local",
        image: null,
      },
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };
  }
  return nextAuth.auth(...args);
}) as typeof nextAuth.auth;
