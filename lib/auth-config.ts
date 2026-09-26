import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

export type AuthEnvironment = {
  NODE_ENV?: string;
  AUTH_SECRET?: string;
  AUTH_GOOGLE_ID?: string;
  AUTH_GOOGLE_SECRET?: string;
  AUTH_URL?: string;
  AUTH_TRUST_HOST?: string;
};

export function getRuntimeAuthEnvironment(): AuthEnvironment {
  return {
    // Vite replaces this direct access at build time. It does not replace
    // environment.NODE_ENV and Workers need not have a NODE_ENV binding.
    NODE_ENV: process.env.NODE_ENV,
    AUTH_SECRET: process.env.AUTH_SECRET,
    AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID,
    AUTH_GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET,
    AUTH_URL: process.env.AUTH_URL,
    AUTH_TRUST_HOST: process.env.AUTH_TRUST_HOST,
  };
}

/** AUTH_URL is the public origin, not an arbitrary redirect destination. */
export function getConfiguredAuthOrigin(environment: AuthEnvironment = getRuntimeAuthEnvironment()) {
  const value = environment.AUTH_URL?.trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.username || url.password || url.search || url.hash || url.pathname !== "/") return null;
    if (url.protocol !== "https:" && !(environment.NODE_ENV !== "production"
      && url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))) return null;
    return url.origin;
  } catch {
    return null;
  }
}

/** Configuration readiness only: never claims to have completed Google login. */
export function getAuthConfigurationIssues(environment: AuthEnvironment = getRuntimeAuthEnvironment()) {
  const issues: string[] = [];
  for (const key of ["AUTH_SECRET", "AUTH_GOOGLE_ID", "AUTH_GOOGLE_SECRET"] as const) {
    if (!environment[key]?.trim()) issues.push(key);
  }
  if ((environment.NODE_ENV === "production" || environment.AUTH_URL?.trim())
    && !getConfiguredAuthOrigin(environment)) issues.push("AUTH_URL");
  if (environment.NODE_ENV === "production" && environment.AUTH_TRUST_HOST?.trim() !== "true") {
    issues.push("AUTH_TRUST_HOST");
  }
  return issues;
}

/** Build a fresh config inside the request, after Worker bindings are available. */
export function getAuthConfig(environment: AuthEnvironment = getRuntimeAuthEnvironment()): NextAuthConfig {
  return {
    secret: environment.AUTH_SECRET?.trim(),
    basePath: "/api/auth",
    providers: [
      Google({
        clientId: environment.AUTH_GOOGLE_ID?.trim(),
        clientSecret: environment.AUTH_GOOGLE_SECRET?.trim(),
        authorization: {
          params: { prompt: "select_account", scope: "openid email profile" },
        },
      }),
    ],
    session: { strategy: "jwt" },
    pages: { signIn: "/login" },
    trustHost: environment.AUTH_TRUST_HOST?.trim() === "true"
      || (environment.NODE_ENV !== "production" && environment.AUTH_TRUST_HOST === undefined),
    callbacks: {
      // Account ownership, quotas and admin allowlists use the session email.
      // Google's presence of an email alone is not proof it has been verified.
      signIn({ account, profile }) {
        return account?.provider === "google" && profile?.email_verified === true
          && typeof profile.email === "string" && profile.email.trim().length > 0;
      },
    },
  };
}
