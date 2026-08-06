"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Boxes,
  Code2,
  FileText,
  FlaskConical,
  Home,
  KeyRound,
  Menu,
  Newspaper,
  Scale,
  UserRound,
  X,
} from "lucide-react";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { LanguageToggle } from "@/components/site/LanguageToggle";
import { ThemeToggle } from "@/components/site/ThemeToggle";
import type { Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type MobileNavigationLabels = {
  home: string;
  chat: string;
  updates: string;
  profile: string;
  more: string;
  menuTitle: string;
  close: string;
  models: string;
  access: string;
  status: string;
  documentation: string;
  developers: string;
  principles: string;
  login: string;
  themeLight: string;
  themeDark: string;
  language: string;
};

function routeIsActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileNavigation({
  locale,
  signedIn,
  labels,
}: {
  locale: Locale;
  signedIn: boolean;
  labels: MobileNavigationLabels;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const pushedHistoryRef = useRef(false);

  const profileHref = signedIn ? "/profile" : "/login";
  const primaryItems = useMemo(
    () => [
      { href: "/", label: labels.home, icon: Home },
      { href: "/playground", label: labels.chat, icon: FlaskConical },
      { href: "/patch-notes", label: labels.updates, icon: Newspaper },
      { href: profileHref, label: signedIn ? labels.profile : labels.login, icon: UserRound },
    ],
    [labels.chat, labels.home, labels.login, labels.profile, labels.updates, profileHref, signedIn],
  );

  const secondaryItems = useMemo(
    () => [
      { href: "/models", label: labels.models, icon: Boxes },
      { href: "/access", label: labels.access, icon: KeyRound },
      { href: "/status", label: labels.status, icon: Activity },
      { href: "/documentation", label: labels.documentation, icon: FileText },
      { href: "/developers", label: labels.developers, icon: Code2 },
      { href: "/truth", label: labels.principles, icon: Scale },
    ],
    [labels],
  );

  const closeMenu = useCallback((fromHistory = false) => {
    setOpen(false);
    if (!fromHistory && pushedHistoryRef.current && window.history.state?.tklabsMobileMenu) {
      pushedHistoryRef.current = false;
      window.history.back();
    }
  }, []);

  const closeForNavigation = useCallback(() => {
    pushedHistoryRef.current = false;
    if (window.history.state?.tklabsMobileMenu) {
      const state = { ...(window.history.state as Record<string, unknown>) };
      delete state.tklabsMobileMenu;
      window.history.replaceState(state, "", window.location.href);
    }
    setOpen(false);
  }, []);

  const openMenu = useCallback(() => {
    if (open) return;
    window.history.pushState({ ...window.history.state, tklabsMobileMenu: true }, "", window.location.href);
    pushedHistoryRef.current = true;
    setOpen(true);
  }, [open]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPortalReady(true);
    const previousPadding = document.body.style.paddingBottom;
    const media = window.matchMedia("(max-width: 1023px)");

    function syncPadding() {
      document.body.style.paddingBottom = media.matches
        ? "calc(4.65rem + env(safe-area-inset-bottom, 0px))"
        : previousPadding;
    }

    syncPadding();
    media.addEventListener("change", syncPadding);
    return () => {
      media.removeEventListener("change", syncPadding);
      document.body.style.paddingBottom = previousPadding;
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = "hidden";

    const frame = requestAnimationFrame(() => {
      panelRef.current?.querySelector<HTMLElement>("a, button")?.focus();
    });

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
        return;
      }

      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = [...panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )];
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    function handlePopState() {
      pushedHistoryRef.current = false;
      setOpen(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("popstate", handlePopState);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("popstate", handlePopState);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [closeMenu, open]);

  const sheet = portalReady && open
    ? createPortal(
        <div className="fixed inset-0 z-[120] lg:hidden" role="presentation">
          <button
            type="button"
            className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
            onClick={() => closeMenu()}
            aria-label={labels.close}
          />
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-site-menu-title"
            className="absolute inset-x-0 bottom-0 max-h-[min(82dvh,720px)] overflow-y-auto rounded-t-[2rem] border border-outline-variant bg-surface-container-lowest px-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] pt-4 shadow-[0_-24px_80px_rgba(0,0,0,.24)]"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between gap-4 bg-surface-container-lowest pb-4">
              <div>
                <p className="label-caps text-secondary">{labels.more}</p>
                <h2 id="mobile-site-menu-title" className="mt-1 font-serif text-2xl text-primary">
                  {labels.menuTitle}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => closeMenu()}
                className="grid size-11 shrink-0 place-items-center rounded-full border border-outline-variant text-primary"
                aria-label={labels.close}
              >
                <X size={18} />
              </button>
            </div>

            <nav className="grid gap-2 sm:grid-cols-2" aria-label={labels.menuTitle}>
              {secondaryItems.map(({ href, label, icon: Icon }) => {
                const active = routeIsActive(pathname, href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={closeForNavigation}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex min-h-14 items-center gap-3 rounded-2xl border px-4 text-sm font-medium transition-colors",
                      active
                        ? "border-primary bg-primary text-on-primary"
                        : "border-outline-variant bg-surface hover:border-primary",
                    )}
                  >
                    <Icon size={18} aria-hidden="true" />
                    {label}
                  </Link>
                );
              })}
            </nav>

            <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-outline-variant bg-surface px-4 py-3">
              <span className="text-sm text-on-surface-variant">{labels.language}</span>
              <div className="flex items-center gap-2">
                <ThemeToggle lightLabel={labels.themeLight} darkLabel={labels.themeDark} />
                <LanguageToggle locale={locale} label={labels.language} />
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-[100] border-t border-outline-variant bg-surface/96 px-2 pt-1.5 backdrop-blur-xl lg:hidden"
        style={{ paddingBottom: "max(.4rem, env(safe-area-inset-bottom, 0px))" }}
        aria-label={labels.menuTitle}
        data-testid="mobile-bottom-navigation"
      >
        <div className="mx-auto grid max-w-lg grid-cols-5 gap-1">
          {primaryItems.map(({ href, label, icon: Icon }) => {
            const active = routeIsActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-[54px] flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-medium leading-none",
                  active ? "bg-primary text-on-primary" : "text-on-secondary-container",
                )}
              >
                <Icon size={19} aria-hidden="true" />
                <span className="max-w-full truncate">{label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={openMenu}
            aria-expanded={open}
            aria-haspopup="dialog"
            className={cn(
              "flex min-h-[54px] flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-medium leading-none",
              open ? "bg-primary text-on-primary" : "text-on-secondary-container",
            )}
          >
            <Menu size={19} aria-hidden="true" />
            <span>{labels.more}</span>
          </button>
        </div>
      </nav>
      {sheet}
    </>
  );
}
