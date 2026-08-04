"use client";

import Link from "next/link";
import Image from "next/image";

import { useLanguage } from "@/components/providers/LanguageProvider";

/* Was: a macOS-style magnification dock of six unlabelled icons — two of which
   were the same `Activity` glyph pointing at different pages. Icons alone were
   not telling anyone where anything went, and the spring magnification was
   physics for its own sake. This is a labelled nav bar. */
const navigation = [
  { key: "home", href: "/#home" },
  { key: "facility", href: "/#facility" },
  { key: "telemetry", href: "/#telemetry" },
  { key: "proof", href: "/#proof" },
  { key: "aiChats", href: "/ai-chats" },
  { key: "status", href: "/status" },
] as const;

export function SiteNav() {
  const { copy, language, setLanguage } = useLanguage();
  const getTitle = (key: (typeof navigation)[number]["key"]) => copy.nav[key];
  const toggleLanguage = () => setLanguage(language === "ru" ? "en" : "ru");

  return (
    <header className="site-nav">
      <Link className="brand-lockup" href="/" aria-label="Imaginary Intelligence">
        <span className="brand-mark" aria-hidden="true"><Image src="/tk-logo.png" alt="" width={28} height={28} unoptimized /></span>
        <span>
          <strong>IMAGINARY</strong>
          <small>INTELLIGENCE / FACILITY</small>
        </span>
      </Link>

      <nav className="site-nav-links" aria-label={copy.nav.primary}>
        {navigation.map((item) => (
          <Link className="site-nav-link" href={item.href} key={item.key}>
            {getTitle(item.key)}
          </Link>
        ))}
      </nav>

      <div className="site-nav-meta">
        <button
          type="button"
          className="lang-toggle"
          onClick={toggleLanguage}
          aria-label={`${copy.nav.language}: ${language === "ru" ? "English" : "Русский"}`}
          title={`${copy.nav.language}: ${language === "ru" ? "English" : "Русский"}`}
        >
          <span className={language === "ru" ? "is-active" : undefined}>RU</span>
          <span aria-hidden="true">/</span>
          <span className={language === "en" ? "is-active" : undefined}>EN</span>
        </button>
      </div>
    </header>
  );
}
