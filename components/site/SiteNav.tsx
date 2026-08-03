"use client";

import Link from "next/link";
import { Activity, ArrowUpRight, Component as ComponentIcon, Eye, HomeIcon, MessageSquareText, Package, ScrollText, SunMoon } from "lucide-react";
import { motion } from "framer-motion";

import { useLanguage } from "@/components/providers/LanguageProvider";
import { Dock, DockIcon, DockItem, DockLabel } from "@/components/ui/dock";

const navigation = [
  { key: "home", href: "/#home", icon: <HomeIcon className="h-5 w-5" aria-hidden="true" /> },
  { key: "facility", href: "/#facility", icon: <Package className="h-5 w-5" aria-hidden="true" /> },
  { key: "telemetry", href: "/#telemetry", icon: <Activity className="h-5 w-5" aria-hidden="true" /> },
  { key: "proof", href: "/#proof", icon: <ComponentIcon className="h-5 w-5" aria-hidden="true" /> },
  { key: "aiChats", href: "/ai-chats", icon: <MessageSquareText className="h-5 w-5" aria-hidden="true" /> },
  { key: "truth", href: "/truth", icon: <ScrollText className="h-5 w-5" aria-hidden="true" /> },
  { key: "status", href: "/status", icon: <Activity className="h-5 w-5" aria-hidden="true" /> },
  { key: "reveal", href: "/#reveal", icon: <SunMoon className="h-5 w-5" aria-hidden="true" /> },
] as const;

export function SiteNav() {
  const { copy, language, setLanguage } = useLanguage();
  const getTitle = (key: (typeof navigation)[number]["key"]) => copy.nav[key];
  const toggleLanguage = () => setLanguage(language === "ru" ? "en" : "ru");

  return (
    <motion.header className="site-nav" initial={{ y: -24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}>
      <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" }}>
        <Link className="brand-lockup" href="/" aria-label="Imaginary Intelligence — главная">
          <span className="brand-mark" aria-hidden="true">II</span>
          <span><strong>IMAGINARY</strong><small>INTELLIGENCE / FACILITY</small></span>
        </Link>
      </motion.div>

      <nav className="site-nav-dock" aria-label={copy.nav.primary}>
        <Dock className="site-dock-panel" ariaLabel={copy.nav.primary}>
          {navigation.map((item) => (
            <DockItem className="site-dock-item" key={item.key}>
              <DockLabel>{getTitle(item.key)}</DockLabel>
              <DockIcon><Link className="site-dock-link" href={item.href} aria-label={getTitle(item.key)}>{item.icon}</Link></DockIcon>
            </DockItem>
          ))}
        </Dock>
      </nav>

      <nav className="site-nav-mobile-links" aria-label={copy.nav.primary}>
        {navigation.slice(0, 5).map((item) => <Link href={item.href} key={item.key}>{getTitle(item.key)}</Link>)}
      </nav>

      <motion.div className="site-nav-meta flex items-center gap-3 font-mono text-[9px] uppercase tracking-[0.16em] text-white/50" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.3, ease: "easeOut" }}>
        <span className="hidden items-center gap-1.5 sm:flex"><Eye size={12} aria-hidden="true" /> {copy.nav.publicPreview}</span>
        <Link className="nav-truth" href="/truth">{copy.common.truth} <ArrowUpRight size={13} aria-hidden="true" /></Link>
        <button
          type="button"
          className="inline-flex items-center gap-1 border border-white/20 bg-black/20 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-white/50 transition hover:border-[#e7ff49]/60 hover:text-[#e7ff49]"
          onClick={toggleLanguage}
          aria-label={`${copy.nav.language}: ${language === "ru" ? "English" : "Русский"}`}
          title={`${copy.nav.language}: ${language === "ru" ? "English" : "Русский"}`}
        >
          <span className={language === "ru" ? "text-[#e7ff49]" : ""}>RU</span><span className="text-white/25">/</span><span className={language === "en" ? "text-[#e7ff49]" : ""}>EN</span>
        </button>
      </motion.div>
    </motion.header>
  );
}
