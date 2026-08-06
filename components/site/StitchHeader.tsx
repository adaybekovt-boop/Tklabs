import Link from "next/link";
import { UserRound } from "lucide-react";

import { auth } from "@/auth";
import { TermsGate } from "@/components/legal/TermsGate";
import { GlowNav } from "@/components/site/GlowNav";
import { MobileNavigation } from "@/components/site/MobileNavigation";
import { LanguageToggle } from "@/components/site/LanguageToggle";
import { SiteLogo } from "@/components/site/SiteLogo";
import { ThemeToggle } from "@/components/site/ThemeToggle";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";

type ActiveSection = "home" | "models" | "access" | "laboratory" | "status" | "documentation" | "developers" | "patch-notes" | "truth";

type StitchHeaderProps = {
  active?: ActiveSection;
  chatMode?: boolean;
};

export async function StitchHeader({ active, chatMode = false }: StitchHeaderProps) {
  const locale = await getLocale();
  const text = getDictionary(locale);
  let signedIn = false;
  try {
    signedIn = Boolean((await auth())?.user);
  } catch {
    // Public pages remain available while optional authentication is unavailable.
  }

  const sectionLabels: Record<ActiveSection, string> = locale === "ru"
    ? { home: "Главная", models: "Модели", access: "Модели", laboratory: "AI-чат", status: "Статус", documentation: "Документация", developers: "Команда", "patch-notes": "Обновления", truth: "Принципы" }
    : { home: "Home", models: "Models", access: "Models", laboratory: "AI chat", status: "Status", documentation: "Documentation", developers: "Team", "patch-notes": "Updates", truth: "Principles" };

  const navLabels = locale === "ru"
    ? { chat: "AI-чат", models: "Модели", updates: "Обновления", status: "Статус" }
    : { chat: "AI chat", models: "Models", updates: "Updates", status: "Status" };

  const mobileLabels = locale === "ru"
    ? {
        home: "Главная",
        chat: "Чат",
        updates: "Обновления",
        profile: "Профиль",
        more: "Ещё",
        menuTitle: "Ресурсы",
        close: "Закрыть меню",
        models: text.footer.models,
        access: text.footer.access,
        status: text.footer.status,
        documentation: text.footer.documentation,
        developers: text.footer.developers,
        principles: text.footer.truth,
        login: text.nav.login,
        themeLight: text.nav.themeLight,
        themeDark: text.nav.themeDark,
        language: text.nav.language,
      }
    : {
        home: "Home",
        chat: "Chat",
        updates: "Updates",
        profile: "Profile",
        more: "More",
        menuTitle: "Resources",
        close: "Close menu",
        models: text.footer.models,
        access: text.footer.access,
        status: text.footer.status,
        documentation: text.footer.documentation,
        developers: text.footer.developers,
        principles: text.footer.truth,
        login: text.nav.login,
        themeLight: text.nav.themeLight,
        themeDark: text.nav.themeDark,
        language: text.nav.language,
      };

  return (
    <>
      {!chatMode && (
        <>
          <header className="sticky top-0 z-50 border-b-[0.5px] border-primary bg-surface/95 backdrop-blur-sm">
            <div className="stitch-container flex min-h-14 items-center justify-between gap-3 md:min-h-[80px] md:gap-8">
              <div className="flex min-w-0 items-center gap-3">
                <Link href="/" className="shrink-0" aria-label="TK LAB">
                  <span className="hidden sm:block"><SiteLogo /></span>
                  <span className="block sm:hidden"><SiteLogo showWordmark={false} /></span>
                </Link>
                <span className="truncate text-[12px] font-medium text-on-surface-variant sm:text-[13px] lg:hidden">
                  {active ? sectionLabels[active] : signedIn ? text.nav.profile : text.nav.login}
                </span>
              </div>

              <div className="hidden lg:block"><GlowNav active={active} labels={navLabels} /></div>

              <div className="hidden items-center gap-4 lg:flex">
                <ThemeToggle lightLabel={text.nav.themeLight} darkLabel={text.nav.themeDark} />
                <LanguageToggle locale={locale} label={text.nav.language} />
                <Link href={signedIn ? "/profile" : "/login"} className="quiet-button min-h-10 px-5 text-[12px]">{signedIn ? text.nav.profile : text.nav.login}</Link>
              </div>

              <div className="flex shrink-0 items-center gap-2 lg:hidden">
                <div className="flex min-h-11 items-center rounded-full border border-outline-variant bg-surface-container-lowest px-3"><LanguageToggle locale={locale} label={text.nav.language} /></div>
                <Link href={signedIn ? "/profile" : "/login"} className="grid size-11 shrink-0 place-items-center rounded-full border border-outline-variant text-primary" aria-label={signedIn ? text.nav.profile : text.nav.login}><UserRound size={18} aria-hidden="true" /></Link>
              </div>
            </div>
          </header>
          <MobileNavigation locale={locale} signedIn={signedIn} labels={mobileLabels} />
        </>
      )}
      <TermsGate enabled={signedIn} locale={locale} />
    </>
  );
}
