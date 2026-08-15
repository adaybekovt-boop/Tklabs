import Link from "next/link";

import { auth } from "@/auth";
import { TermsGate } from "@/components/legal/TermsGate";
import { AppDock } from "@/components/site/AppDock";
import { LanguageToggle } from "@/components/site/LanguageToggle";
import { SiteLogo } from "@/components/site/SiteLogo";
import { ThemeToggle } from "@/components/site/ThemeToggle";
import { AnimatedNavFramer } from "@/components/ui/navigation-menu";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { cn } from "@/lib/utils";

type ActiveSection = "home" | "models" | "access" | "laboratory" | "status" | "documentation" | "developers" | "patch-notes" | "truth";

type StitchHeaderProps = {
  active?: ActiveSection;
  chatMode?: boolean;
  transparent?: boolean;
};

export async function StitchHeader({ active, chatMode = false, transparent = false }: StitchHeaderProps) {
  const locale = await getLocale();
  const text = getDictionary(locale);
  let signedIn = false;
  try {
    signedIn = Boolean((await auth())?.user);
  } catch {
    // Public pages remain available while optional authentication is unavailable.
  }

  const sectionLabels: Record<ActiveSection, string> = locale === "ru"
    ? { home: "Главная", models: "Модели", access: "Доступ", laboratory: "AI-чат", status: "Статус", documentation: "Документация", developers: "Команда", "patch-notes": "Обновления", truth: "Принципы" }
    : { home: "Home", models: "Models", access: "Access", laboratory: "AI chat", status: "Status", documentation: "Documentation", developers: "Team", "patch-notes": "Updates", truth: "Principles" };

  const dockLabels = locale === "ru"
    ? {
        home: "Главная",
        chat: "AI-чат",
        updates: "Обновления",
        profile: "Профиль",
        more: "Ещё",
        menuTitle: "Навигация TK LAB",
        close: "Закрыть меню",
        workspaceTitle: "Рабочее пространство",
        resourcesTitle: "Информация и команда",
        models: text.footer.models,
        vault: "Workspace Vault",
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
        chat: "AI chat",
        updates: "Updates",
        profile: "Profile",
        more: "More",
        menuTitle: "TK LAB navigation",
        close: "Close menu",
        workspaceTitle: "Workspace",
        resourcesTitle: "Information and team",
        models: text.footer.models,
        vault: "Workspace Vault",
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
          <AnimatedNavFramer locale={locale} />
          <header
            className={cn(
              "sticky top-0 z-50 hidden min-h-[72px] transition-colors duration-200 lg:block",
              transparent
                ? "border-b-0 bg-transparent"
                : "border-b border-outline-variant/30 bg-surface/95 backdrop-blur-sm",
            )}
            data-desktop-site-header
            data-device-version="desktop"
          >
            <div className="stitch-container flex min-h-[72px] items-center justify-between gap-8">
              <div className="flex min-w-0 items-center gap-3">
                <Link href="/" className="shrink-0" aria-label="TK LAB">
                  <SiteLogo showWordmark={!transparent} />
                </Link>
                {!transparent && (
                  <span className="truncate text-[13px] font-medium text-on-surface-variant">
                    {active ? sectionLabels[active] : signedIn ? text.nav.profile : text.nav.login}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4">
                <ThemeToggle lightLabel={text.nav.themeLight} darkLabel={text.nav.themeDark} />
                <LanguageToggle locale={locale} label={text.nav.language} />
                {!transparent && (
                  <Link href={signedIn ? "/profile" : "/login"} className="quiet-button min-h-10 px-5 text-[12px]">
                    {signedIn ? text.nav.profile : text.nav.login}
                  </Link>
                )}
              </div>
            </div>
          </header>
          <AppDock locale={locale} signedIn={signedIn} labels={dockLabels} />
        </>
      )}
      <TermsGate enabled={signedIn} locale={locale} />
    </>
  );
}
