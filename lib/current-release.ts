import type { Locale } from "@/lib/i18n";
import { getPreviewRelease } from "@/lib/prerelease";

export function getCurrentRelease(locale: Locale) {
  return getPreviewRelease(locale);
}
