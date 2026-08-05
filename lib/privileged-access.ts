import type { ClodexAccessStatus } from "@/lib/clodex-access";

const DEFAULT_UNLIMITED_AI_EMAILS = [
  "kandykbayevtagir@gmail.com",
  "adaybekovt@bk.ru",
] as const;

function configuredEmails() {
  const configured = process.env.UNLIMITED_AI_EMAILS?.split(",").map((email) => email.trim().toLowerCase()).filter(Boolean) ?? [];
  return new Set<string>([...DEFAULT_UNLIMITED_AI_EMAILS, ...configured]);
}

export function isPrivilegedAiEmail(email: string | null | undefined) {
  const normalized = email?.trim().toLowerCase();
  return Boolean(normalized && configuredEmails().has(normalized));
}

export function privilegedAccessStatus(): ClodexAccessStatus {
  return {
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
  const configured = process.env.CLODEX_PROMO_EMAILS?.split(",").map((value) => value.trim().toLowerCase()).filter(Boolean) ?? [];
  return configured.includes(normalized);
}
