"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import type { Locale } from "@/lib/i18n";

const LOCALE_COOKIE = "tklab-locale";

export function LanguageToggle({ locale, label }: { locale: Locale; label: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function changeLocale(nextLocale: Locale) {
    if (nextLocale === locale || pending) return;
    document.cookie = LOCALE_COOKIE + "=" + nextLocale + "; Path=/; Max-Age=31536000; SameSite=Lax";
    window.localStorage.setItem(LOCALE_COOKIE, nextLocale);
    document.documentElement.lang = nextLocale;
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex items-center gap-1 text-[11px] uppercase tracking-[0.12em]" aria-label={label}>
      <button
        type="button"
        onClick={() => changeLocale("ru")}
        disabled={pending}
        className={locale === "ru" ? "font-medium text-primary" : "text-secondary transition-colors hover:text-primary"}
        aria-pressed={locale === "ru"}
      >
        RU
      </button>
      <span className="text-outline-variant">/</span>
      <button
        type="button"
        onClick={() => changeLocale("en")}
        disabled={pending}
        className={locale === "en" ? "font-medium text-primary" : "text-secondary transition-colors hover:text-primary"}
        aria-pressed={locale === "en"}
      >
        EN
      </button>
    </div>
  );
}