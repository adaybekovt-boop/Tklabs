import { hmacSha256Hex } from "@/lib/rate-limit-identity";

export class TermsUserIdConfigurationError extends Error {
  constructor() {
    super("TERMS_USER_ID_SECRET is not configured.");
    this.name = "TermsUserIdConfigurationError";
  }
}

export function getTermsUserIdSecret() {
  const secret = process.env.TERMS_USER_ID_SECRET?.trim();
  if (!secret) throw new TermsUserIdConfigurationError();
  return secret;
}

export async function termsUserId(email: string, secret = getTermsUserIdSecret()) {
  const normalizedEmail = email.trim().toLowerCase();
  return `user:${await hmacSha256Hex(normalizedEmail, secret)}`;
}

/** Legacy lookup is retained only to detect and migrate rows created before HMAC user IDs. */
export async function legacyTermsUserId(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(normalizedEmail));
  const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `user:${hash}`;
}
