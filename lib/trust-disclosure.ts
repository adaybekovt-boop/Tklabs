export const TRUST_DISCLOSURE_VERSION = "2026-08-08.v1";
export const TRUST_DISCLOSURE_KEY = "tklabs.trust-disclosure.v1";
export const TRUST_DISCLOSURE_EVENT = "tklabs:trust-disclosure-changed";

export function isTrustDisclosureAcknowledged(storage?: Pick<Storage, "getItem">) {
  if (!storage && typeof window === "undefined") return false;
  try { return (storage ?? window.localStorage).getItem(TRUST_DISCLOSURE_KEY) === TRUST_DISCLOSURE_VERSION; } catch { return false; }
}

export function acknowledgeTrustDisclosure(storage?: Pick<Storage, "setItem">) {
  const target = storage ?? (typeof window === "undefined" ? null : window.localStorage);
  if (!target) return;
  target.setItem(TRUST_DISCLOSURE_KEY, TRUST_DISCLOSURE_VERSION);
  if (typeof window !== "undefined") window.dispatchEvent(new Event(TRUST_DISCLOSURE_EVENT));
}

export function subscribeTrustDisclosure(callback: () => void) {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(TRUST_DISCLOSURE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => { window.removeEventListener(TRUST_DISCLOSURE_EVENT, callback); window.removeEventListener("storage", callback); };
}
