import type { ClodexAccessStatus } from "@/lib/clodex-access";

const FULL_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase() ?? "";
  return normalized.length <= 320 && FULL_EMAIL_PATTERN.test(normalized) ? normalized : null;
}

export function parseEmailAllowlist(value: string | undefined) {
  const entries = (value ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  if (entries.some((email) => !normalizeEmail(email))) return new Set<string>();
  return new Set(entries);
}

export function parseUnlimitedEmails(value?: string) {
  return parseEmailAllowlist(value);
}

export function hasUnlimitedAccess(sessionEmail: string | null | undefined, configuredEmails?: string) {
  const normalized = normalizeEmail(sessionEmail);
  return Boolean(normalized && parseUnlimitedEmails(configuredEmails).has(normalized));
}

export function isPrivilegedAiEmail(email: string | null | undefined) {
  return hasUnlimitedAccess(email, process.env.UNLIMITED_AI_EMAILS);
}

/**
 * Administrator actions (revoking another account's access, reviewing all
 * accounts' terms consent) use their own allowlist, separate from
 * UNLIMITED_AI_EMAILS. That list grants AI/TTS quota bypass and may be
 * handed out more broadly (e.g. beta testers); it must not also grant
 * admin power over other users' accounts.
 */
export function isAdminEmail(email: string | null | undefined) {
  const normalized = email?.trim().toLowerCase() ?? "";
  return Boolean(normalized && parseEmailAllowlist(process.env.ADMIN_EMAILS).has(normalized));
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
