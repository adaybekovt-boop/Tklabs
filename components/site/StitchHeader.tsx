import Link from "next/link";

import { auth } from "@/auth";
import { TermsGate } from "@/components/legal/TermsGate";
import { AppDock } from "@/components/site/AppDock";
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
        modelsHint: "Сравнение Erma-моделей и их возможностей",
        vault: "Workspace Vault",
        vaultHint: "Полный локальный бэкап и восстановление данных",
        status: text.footer.status,
        statusHint: "Проверка доступности сервисов и AI-провайдеров",
        documentation: text.footer.documentation,
        documentationHint: "Инструкции, API и устройство платформы",
        developers: text.footer.developers,
        developersHint: "Команда, роли и история TK LAB",
        principles: text.footer.truth,
        principlesHint: "Принципы продукта, безопасности и прозрачности",
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
        modelsHint: "Compare Erma models and their capabilities",
        vault: "Workspace Vault",
        vaultHint: "Complete local backup and restore",
        status: text.footer.status,
        statusHint: "Check service and AI provider availability",
        documentation: text.footer.documentation,
        documentationHint: "Guides, API details, and platform architecture",
        developers: text.footer.developers,
        developersHint: "Team, roles, and the TK LAB story",
        principles: text.footer.truth,
        principlesHint: "Product, safety, and transparency principles",
        login: text.nav.login,
        themeLight: text.nav.themeLight,
        themeDark: text.nav.themeDark,
        language: text.nav.language,
      };

  return (
    <>
      {!chatMode && (
        <>
          <header className="sticky top-0 z-50 hidden border-b border-outline-variant/30 bg-surface/95 backdrop-blur-sm lg:block" data-desktop-site-header>
            <div className="stitch-container flex min-h-[72px] items-center justify-between gap-8">
              <div className="flex min-w-0 items-center gap-3">
                <Link href="/" className="shrink-0" aria-label="TK LAB"><SiteLogo /></Link>
                <span className="truncate text-[13px] font-medium text-on-surface-variant">
                  {active ? sectionLabels[active] : signedIn ? text.nav.profile : text.nav.login}
                </span>
              </div>

              <div className="flex items-center gap-4">
                <ThemeToggle lightLabel={text.nav.themeLight} darkLabel={text.nav.themeDark} />
                <LanguageToggle locale={locale} label={text.nav.language} />
                <Link href={signedIn ? "/profile" : "/login"} className="quiet-button min-h-10 px-5 text-[12px]">{signedIn ? text.nav.profile : text.nav.login}</Link>
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
