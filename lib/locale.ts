import { cookies } from "next/headers";

import type { Locale } from "@/lib/i18n";

export const LOCALE_COOKIE = "tklab-locale";

export async function getLocale(): Promise<Locale> {
  // Local runtimes can evaluate a page outside Next's request context.
  // Locale is only a visual preference, so Russian is a safe fallback.
  try {
    const value = (await cookies()).get(LOCALE_COOKIE)?.value;
    return value === "en" ? "en" : "ru";
  } catch {
    return "ru";
  }
}