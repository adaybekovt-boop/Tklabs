"use client";

import { CURRENT_TERMS_VERSION, type TermsLanguage } from "@/lib/terms";

const STORAGE_KEY = `tklab.local-terms.${CURRENT_TERMS_VERSION}`;

type LocalConsent = {
  version: string;
  language: TermsLanguage;
};

export function readLocalTermsConsent(): LocalConsent | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<LocalConsent>;
    if (value.version !== CURRENT_TERMS_VERSION || (value.language !== "ru" && value.language !== "en")) return null;
    return { version: value.version, language: value.language };
  } catch {
    return null;
  }
}

export function writeLocalTermsConsent(language: TermsLanguage) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: CURRENT_TERMS_VERSION, language } satisfies LocalConsent));
  } catch {
    // Local development should remain usable even when browser storage is blocked.
  }
}
