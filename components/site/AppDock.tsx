"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Boxes,
  Code2,
  DatabaseBackup,
  FileText,
  FlaskConical,
  Home,
  Menu,
  Newspaper,
  Scale,
  UserRound,
  X,
} from "lucide-react";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

import { LanguageToggle } from "@/components/site/LanguageToggle";
import { ThemeToggle } from "@/components/site/ThemeToggle";
import { lockDocumentScroll } from "@/lib/document-scroll-lock";
import type { Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type AppDockLabels = {
  home: string;
  chat: string;
  updates: string;
  profile: string;
  more: string;
  menuTitle: string;
  close: string;
  workspaceTitle: string;
  resourcesTitle: string;
  models: string;
  modelsHint: string;
  vault: string;
  vaultHint: string;
  status: string;
  statusHint: string;
  documentation: string;
  documentationHint: string;
  developers: string;
  developersHint: string;
  principles: string;
  principlesHint: string;
  login: string;
  themeLight: string;
  themeDark: string;
  language: string;
};

const subscribeClientReady = () => () => undefined;
const clientReadySnapshot = () => true;
const serverReadySnapshot = () => false;

function routeIsActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppDock({
  locale,
  signedIn,
  labels,
}: {
  locale: Locale;
  signedIn: boolean;
  labels: AppDockLabels;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const pushedHistoryRef = useRef(false);
  const portalReady = useSyncExternalStore(subscribeClientReady, clientReadySnapshot, serverReadySnapshot);

  const profileHref = signedIn ? "/profile" : "/login";
  const primaryItems = useMemo(
    () => [
      { href: "/", label: labels.home, icon: Home },
      { href: "/patch-notes", label: labels.updates, icon: Newspaper },
      { href: "/playground", label: labels.chat, icon: FlaskConical, prominent: true },
      { href: profileHref, label: signedIn ? labels.profile : labels.login, icon: UserRound },
    ],
    [labels.chat, labels.home, labels.login, labels.profile, labels.updates, profileHref, signedIn],
  );

  const secondaryGroups = useMemo(
    () => [
      {
        title: labels.workspaceTitle,
        items: [
          { href: "/models", label: labels.models, hint: labels.modelsHint, icon: Boxes },
          { href: "/vault", label: labels.vault, hint: labels.vaultHint, icon: DatabaseBackup },
          { href: "/status", label: labels.status, hint: labels.statusHint, icon: Activity },
        ],
      },
      {
        title: labels.resourcesTitle,
        items: [
          { href: "/documentation", label: labels.documentation, hint: labels.documentationHint, icon: FileText },
          { href: "/developers", label: labels.developers, hint: labels.developersHint, icon: Code2 },
          { href: "/truth", label: labels.principles, hint: labels.principlesHint, icon: Scale },
        ],
      },
    ],
    [labels],
  );

  const moreActive = secondaryGroups.some((group) => group.items.some((item) => routeIsActive(pathname, item.href)));

  const closeMenu = useCallback((fromHistory = false) => {
    setOpen(false);
    if (!fromHistory && pushedHistoryRef.current && window.history.state?.tklabsAppDockMenu) {
      pushedHistoryRef.current = false;
      window.history.back();
    }
  }, []);

  const closeForNavigation = useCallback(() => {
    pushedHistoryRef.current = false;
    if (window.history.state?.tklabsAppDockMenu) {
      const state = { ...(window.history.state as Record<string, unknown>) };
      delete state.tklabsAppDockMenu;
      window.history.replaceState(state, "", window.location.href);
    }
    setOpen(false);
  }, []);

  const openMenu = useCallback(() => {
    if (open) return;
    window.history.pushState({ ...window.history.state, tklabsAppDockMenu: true }, "", window.location.href);
    pushedHistoryRef.current = true;
    setOpen(true);
  }, [open]);

  useEffect(() => {
    const previousPadding = document.body.style.paddingBottom;
    document.body.style.paddingBottom = "calc(6.2rem + env(safe-area-inset-bottom, 0px))";
    return () => {
      document.body.style.paddingBottom = previousPadding;
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const releaseScrollLock = lockDocumentScroll();

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
      releaseScrollLock();
      previousFocus?.focus();
    };
  }, [closeMenu, open]);

  const sheet = portalReady && open
    ? createPortal(
        <div className="fixed inset-0 z-[160]" role="presentation" data-app-dock-sheet>
          <button
            type="button"
            className="absolute inset-0 rounded-none bg-black/45 backdrop-blur-[3px]"
            onClick={() => closeMenu()}
            aria-label={labels.close}
            data-app-dock-backdrop
          />
          <div className="absolute inset-x-0 bottom-0 flex justify-center px-0 sm:px-4 sm:pb-4">
            <div
              ref={panelRef}
              id="app-dock-menu"
              role="dialog"
              aria-modal="true"
              aria-labelledby="app-dock-menu-title"
              className="max-h-[min(86dvh,760px)] w-full max-w-3xl overflow-y-auto overscroll-contain rounded-t-[2rem] border border-outline-variant bg-surface-container-lowest px-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] pt-4 shadow-[0_-24px_80px_rgba(0,0,0,.24)] sm:rounded-[2rem] sm:p-5"
              data-app-dock-panel
            >
              <div className="sticky top-0 z-10 flex items-center justify-between gap-4 bg-surface-container-lowest pb-4">
                <div>
                  <p className="label-caps text-secondary">{labels.more}</p>
                  <h2 id="app-dock-menu-title" className="mt-1 font-serif text-2xl text-primary">{labels.menuTitle}</h2>
                </div>
                <button
                  type="button"
                  onClick={() => closeMenu()}
                  className="grid size-11 shrink-0 place-items-center rounded-full border border-outline-variant text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
                  aria-label={labels.close}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-5">
                {secondaryGroups.map((group) => (
                  <section key={group.title} aria-label={group.title} data-app-dock-group>
                    <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.13em] text-secondary">{group.title}</p>
                    <nav className="grid gap-2 sm:grid-cols-2" aria-label={group.title}>
                      {group.items.map(({ href, label, hint, icon: Icon }) => {
                        const active = routeIsActive(pathname, href);
                        return (
                          <Link
                            key={href}
                            href={href}
                            onClick={closeForNavigation}
                            aria-current={active ? "page" : undefined}
                            data-dock-link
                            data-active={active ? "true" : "false"}
                            className={cn(
                              "flex min-h-[4.5rem] items-center gap-3 rounded-2xl border px-4 py-3 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20",
                              active
                                ? "border-primary bg-primary text-on-primary"
                                : "border-outline-variant bg-surface hover:border-primary",
                            )}
                          >
                            <span className={cn("grid size-10 shrink-0 place-items-center rounded-2xl", active ? "bg-white/15" : "bg-surface-container-low")}>
                              <Icon size={18} aria-hidden="true" />
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-semibold">{label}</span>
                              <span className={cn("mt-0.5 block text-[11px] leading-[1.4]", active ? "text-on-primary/75" : "text-on-surface-variant")}>{hint}</span>
                            </span>
                          </Link>
                        );
                      })}
                    </nav>
                  </section>
                ))}
              </div>

              <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-outline-variant bg-surface px-4 py-3">
                <span className="text-sm text-on-surface-variant">{labels.language}</span>
                <div className="flex items-center gap-2">
                  <ThemeToggle lightLabel={labels.themeLight} darkLabel={labels.themeDark} />
                  <LanguageToggle locale={locale} label={labels.language} />
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )
    : null;

  const dock = portalReady
    ? createPortal(
        <nav
          className="fixed inset-x-2 bottom-2 z-[120] mx-auto max-w-[34rem] rounded-[1.4rem] border border-outline-variant bg-surface/94 px-2 py-1.5 shadow-[0_18px_60px_rgba(0,0,0,.15)] backdrop-blur-xl sm:bottom-4 sm:px-3"
          style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}
          aria-label={labels.menuTitle}
          data-testid="app-bottom-navigation"
          data-app-dock
        >
          <div className="grid grid-cols-5 gap-1">
            {primaryItems.map(({ href, label, icon: Icon, prominent }) => {
              const active = routeIsActive(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  data-dock-link
                  data-active={active ? "true" : "false"}
                  className={cn(
                    "group relative flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[10px] font-semibold leading-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 sm:text-[11px]",
                    prominent && "-mt-3",
                    active ? "text-primary" : "text-on-secondary-container",
                  )}
                >
                  <span
                    className={cn(
                      "grid place-items-center",
                      prominent ? "size-12 rounded-full border border-primary/20 shadow-[0_10px_28px_rgba(15,23,42,.16)]" : "size-8 rounded-xl",
                      active
                        ? "bg-primary text-on-primary"
                        : prominent
                          ? "bg-surface-container-lowest text-primary"
                          : "bg-transparent",
                    )}
                    data-dock-icon
                  >
                    <Icon size={prominent ? 21 : 19} aria-hidden="true" />
                  </span>
                  <span className="max-w-full truncate">{label}</span>
                  {active ? <span className="absolute bottom-0.5 size-1 rounded-full bg-primary" aria-hidden="true" data-dock-indicator /> : null}
                </Link>
              );
            })}
            <button
              type="button"
              onClick={openMenu}
              aria-expanded={open}
              aria-haspopup="dialog"
              aria-controls="app-dock-menu"
              data-dock-link
              data-active={open || moreActive ? "true" : "false"}
              className={cn(
                "relative flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[10px] font-semibold leading-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 sm:text-[11px]",
                open || moreActive ? "text-primary" : "text-on-secondary-container",
              )}
            >
              <span className={cn("grid size-8 place-items-center rounded-xl", open || moreActive ? "bg-primary text-on-primary" : "bg-transparent")} data-dock-icon>
                <Menu size={19} aria-hidden="true" />
              </span>
              <span>{labels.more}</span>
              {moreActive ? <span className="absolute bottom-0.5 size-1 rounded-full bg-primary" aria-hidden="true" data-dock-indicator /> : null}
            </button>
          </div>
        </nav>,
        document.body,
      )
    : null;

  return <>{dock}{sheet}</>;
}
