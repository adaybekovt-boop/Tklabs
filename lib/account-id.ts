import { hmacSha256Hex } from "@/lib/rate-limit-identity";

export class AccountIdConfigurationError extends Error {
  constructor() {
    super("ACCOUNT_ID_SECRET is not configured.");
    this.name = "AccountIdConfigurationError";
  }
}

export function getAccountIdSecret() {
  const secret = process.env.ACCOUNT_ID_SECRET?.trim();
  if (!secret) throw new AccountIdConfigurationError();
  return secret;
}

export async function accountObjectName(email: string, secret = getAccountIdSecret()) {
  const normalizedEmail = email.trim().toLowerCase();
  return `account:${await hmacSha256Hex(normalizedEmail, secret)}`;
}

/** Legacy lookup is retained only to migrate accounts created before HMAC IDs. */
export async function legacyAccountObjectName(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(normalizedEmail));
  const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `account:${hash}`;
}
