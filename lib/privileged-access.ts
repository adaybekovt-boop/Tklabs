import type { ClodexAccessStatus } from "@/lib/clodex-access";

export function parseEmailAllowlist(value: string | undefined) {
  return new Set(
    (value ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

function configuredEmails() {
  return parseEmailAllowlist(process.env.UNLIMITED_AI_EMAILS);
}

export function isPrivilegedAiEmail(email: string | null | undefined) {
  const normalized = email?.trim().toLowerCase();
  return Boolean(normalized && configuredEmails().has(normalized));
}

export function privilegedAccessStatus(): ClodexAccessStatus {
  return {
    hasGrant: true,
    active: true,
    unlimited: true,
    limit: Number.MAX_SAFE_INTEGER,
    windowMs: 0,
    remaining: Number.MAX_SAFE_INTEGER,
    resetAt: null,
  };
}

export function isClodexPromoEligible(email: string | null | undefined) {
  const normalized = email?.trim().toLowerCase();
  if (!normalized) return false;
  return parseEmailAllowlist(process.env.CLODEX_PROMO_EMAILS).has(normalized);
}
