import Link from "next/link";
import { LanguageToggle } from "@/components/site/LanguageToggle";
import { ThemeToggle } from "@/components/site/ThemeToggle";
import { SiteLogo } from "@/components/site/SiteLogo";
import type { Locale } from "@/lib/i18n";

export function HomeHeader({ locale, signedIn }: { locale: Locale; signedIn: boolean }) {
  const ru = locale === "ru";
  return <header className="home-header">
    <Link href="/" className="home-brand" aria-label="TK Labs — Erma"><SiteLogo/><span className="home-brand-product"> / ERMA</span></Link>
    <nav aria-label={ru ? "Основная навигация" : "Primary navigation"}>
      <Link href="/models">{ru ? "Модели" : "Models"}</Link>
      <Link href="/documentation">{ru ? "Документация" : "Documentation"}</Link>
      <Link href={signedIn ? "/profile" : "/login"}>{signedIn ? (ru ? "Профиль" : "Profile") : (ru ? "Войти" : "Sign in")}</Link>
    </nav>
    <div className="home-preferences"><ThemeToggle lightLabel={ru ? "Светлая тема приложения" : "Light app theme"} darkLabel={ru ? "Тёмная тема приложения" : "Dark app theme"}/><LanguageToggle locale={locale} label={ru ? "Язык" : "Language"}/></div>
  </header>;
}
