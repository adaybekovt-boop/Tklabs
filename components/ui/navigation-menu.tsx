"use client";

import * as React from "react";
import Link from "next/link";
import { motion, useScroll, useMotionValueEvent, type Variants } from "framer-motion";
import { Menu } from "lucide-react";

import { SiteLogo } from "@/components/site/SiteLogo";
import { cn } from "@/lib/utils";

export type NavItem = {
  name: string;
  href: string;
};

const DEFAULT_NAV_ITEMS_RU: NavItem[] = [
  { name: "Главная", href: "/" },
  { name: "Модели", href: "/models" },
  { name: "AI-чат", href: "/playground" },
  { name: "Статус", href: "/status" },
  { name: "Обновления", href: "/patch-notes" },
  { name: "Документация", href: "/documentation" },
];

const DEFAULT_NAV_ITEMS_EN: NavItem[] = [
  { name: "Home", href: "/" },
  { name: "Models", href: "/models" },
  { name: "AI Chat", href: "/playground" },
  { name: "Status", href: "/status" },
  { name: "Updates", href: "/patch-notes" },
  { name: "Docs", href: "/documentation" },
];

const EXPAND_SCROLL_THRESHOLD = 80;

const containerVariants: Variants = {
  expanded: {
    y: 0,
    opacity: 1,
    width: "auto",
    transition: {
      type: "spring",
      damping: 24,
      stiffness: 300,
      staggerChildren: 0.04,
      delayChildren: 0.06,
    },
  },
  collapsed: {
    y: 0,
    opacity: 1,
    width: "3rem",
    transition: {
      type: "spring",
      damping: 24,
      stiffness: 300,
      when: "afterChildren",
      staggerChildren: 0.03,
      staggerDirection: -1,
    },
  },
};

const logoVariants: Variants = {
  expanded: { opacity: 1, x: 0, transition: { duration: 0.2, ease: "easeOut" } },
  collapsed: { opacity: 0, x: -16, transition: { duration: 0.15, ease: "easeIn" } },
};

const itemVariants: Variants = {
  expanded: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { type: "spring", damping: 20, stiffness: 300 },
  },
  collapsed: {
    opacity: 0,
    x: -12,
    scale: 0.95,
    transition: { duration: 0.12, ease: "easeIn" },
  },
};

const collapsedIconVariants: Variants = {
  expanded: {
    opacity: 0,
    scale: 0.7,
    transition: { duration: 0.1 },
  },
  collapsed: {
    opacity: 1,
    scale: 1,
    transition: {
      type: "spring",
      damping: 18,
      stiffness: 320,
      delay: 0.12,
    },
  },
};

export function AnimatedNavFramer({
  items,
  locale = "ru",
  className,
}: {
  items?: NavItem[];
  locale?: string;
  className?: string;
}) {
  const [isExpanded, setExpanded] = React.useState(true);
  const navItems = items || (locale === "en" ? DEFAULT_NAV_ITEMS_EN : DEFAULT_NAV_ITEMS_RU);

  const { scrollY } = useScroll();
  const lastScrollY = React.useRef(0);
  const peakScrollY = React.useRef(0);

  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = lastScrollY.current;

    if (latest > previous) {
      peakScrollY.current = Math.max(peakScrollY.current, latest);
      if (isExpanded && latest > 150) setExpanded(false);
    } else if (latest < previous && !isExpanded && peakScrollY.current - latest > EXPAND_SCROLL_THRESHOLD) {
      setExpanded(true);
      peakScrollY.current = latest;
    }

    lastScrollY.current = latest;
  });

  const expandFromCollapsed = () => {
    if (!isExpanded) setExpanded(true);
  };

  const handleNavClick = (e: React.MouseEvent) => {
    if (!isExpanded) {
      e.preventDefault();
      e.stopPropagation();
      expandFromCollapsed();
    }
  };

  const handleNavKeyDown = (e: React.KeyboardEvent) => {
    if (!isExpanded && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      expandFromCollapsed();
    }
  };

  return (
    <div className={cn("fixed top-5 left-1/2 -translate-x-1/2 z-[100] hidden xl:block", className)}>
      <motion.nav
        initial={{ y: -80, opacity: 0 }}
        animate={isExpanded ? "expanded" : "collapsed"}
        variants={containerVariants}
        whileHover={!isExpanded ? { scale: 1.08 } : {}}
        whileTap={!isExpanded ? { scale: 0.96 } : {}}
        onClick={handleNavClick}
        onKeyDown={handleNavKeyDown}
        role={!isExpanded ? "button" : undefined}
        tabIndex={!isExpanded ? 0 : undefined}
        aria-label={!isExpanded ? (locale === "en" ? "Open navigation menu" : "Открыть меню навигации") : undefined}
        className={cn(
          "relative flex h-12 items-center overflow-hidden whitespace-nowrap rounded-full border border-outline-variant/70 bg-surface/90 shadow-[0_12px_36px_rgba(0,0,0,0.12)] backdrop-blur-xl transition-colors duration-200 hover:border-primary/40",
          !isExpanded && "cursor-pointer justify-center",
        )}
      >
        <motion.div
          variants={logoVariants}
          className={cn(
            "flex shrink-0 items-center pl-2.5 pr-2 whitespace-nowrap",
            !isExpanded && "pointer-events-none invisible",
          )}
        >
          <Link
            href="/"
            className="flex items-center shrink-0"
            aria-label="TK LAB"
            tabIndex={!isExpanded ? -1 : undefined}
            onClick={(e) => {
              if (!isExpanded) {
                e.preventDefault();
                e.stopPropagation();
                setExpanded(true);
              }
            }}
          >
            <SiteLogo showWordmark={false} />
          </Link>
        </motion.div>

        <motion.div
          className={cn(
            "flex shrink-0 items-center gap-1 pr-4 whitespace-nowrap",
            !isExpanded && "pointer-events-none invisible",
          )}
        >
          {navItems.map((item) => (
            <motion.div key={item.name} variants={itemVariants} className="shrink-0 whitespace-nowrap">
              <Link
                href={item.href}
                onClick={(e) => e.stopPropagation()}
                className="block whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary"
              >
                {item.name}
              </Link>
            </motion.div>
          ))}
        </motion.div>

        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <motion.div
            variants={collapsedIconVariants}
            animate={isExpanded ? "expanded" : "collapsed"}
            className="text-primary flex items-center justify-center"
          >
            <Menu className="size-5" />
          </motion.div>
        </div>
      </motion.nav>
    </div>
  );
}
