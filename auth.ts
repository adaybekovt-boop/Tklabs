import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

import { isLocalPreviewEnabled } from "@/lib/local-preview";

const nextAuth = NextAuth({
  providers: [
    Google({
      authorization: {
        params: {
          prompt: "select_account",
          scope: "openid email profile",
        },
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  trustHost: process.env.AUTH_TRUST_HOST !== "false",
});

export const handlers = nextAuth.handlers;
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
