import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

const localPreviewEnabled = process.env.TKLABS_LOCAL_PREVIEW === "true"
  || process.env.NEXT_PUBLIC_TKLABS_LOCAL_PREVIEW === "true";
const localPreviewSecret = localPreviewEnabled
  ? "tklabs-browser-assurance-local-secret-2026"
  : undefined;

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
  trustHost: process.env.AUTH_TRUST_HOST !== "false",
});
