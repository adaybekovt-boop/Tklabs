import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

import { isLocalPreviewEnabled } from "@/lib/local-preview";

const localPreviewSecret = isLocalPreviewEnabled()
  ? `tklabs-local-preview-${crypto.randomUUID()}-${crypto.randomUUID()}`
  : undefined;
const trustHost = process.env.NODE_ENV === "development"
  ? process.env.AUTH_TRUST_HOST !== "false"
  : process.env.AUTH_TRUST_HOST === "true";

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET?.trim() || localPreviewSecret,
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
  trustHost,
});
