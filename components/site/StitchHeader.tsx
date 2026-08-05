import Link from "next/link";

import { auth } from "@/auth";
import { GlowNav } from "@/components/site/GlowNav";
import { LanguageToggle } from "@/components/site/LanguageToggle";
import { SiteLogo } from "@/components/site/SiteLogo";
import { TermsGate } from "@/components/legal/TermsGate";
import { ThemeToggle } from "@/components/site/ThemeToggle";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";

type StitchHeaderProps = {
  active?: "home" | "models" | "access" | "laboratory" | "status" | "documentation" | "developers" | "patch-notes" | "truth";
};

export async function StitchHeader({ active }: StitchHeaderProps) {
  const locale = await getLocale();
  const text = getDictionary(locale);
  let signedIn = false;
  try {
    signedIn = Boolean((await auth())?.user);
  } catch {
    // Public pages should remain available while authentication is being configured.
  }

  return (
    <>
      <header className="sticky top-0 z-50 border-b-[0.5px] border-primary bg-surface/95 backdrop-blur-sm">
        <div className="stitch-container flex min-h-[68px] items-center justify-between gap-3 md:min-h-[80px] md:gap-8">
          <Link href="/" className="shrink-0" aria-label="TK LAB"><SiteLogo /></Link>
          <div className="hidden lg:block">
            <GlowNav active={active} />
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle lightLabel={text.nav.themeLight} darkLabel={text.nav.themeDark} />
            <LanguageToggle locale={locale} label={text.nav.language} />
            <Link href={signedIn ? "/profile" : "/login"} className="quiet-button min-h-9 px-3 text-[11px] md:min-h-10 md:px-5 md:text-[12px]">
              {signedIn ? text.nav.profile : text.nav.login}
            </Link>
          </div>
        </div>
      </header>
      <TermsGate enabled={signedIn} locale={locale} />
    </>
  );
}
