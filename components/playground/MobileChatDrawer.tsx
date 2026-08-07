"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Activity, DatabaseBackup, FileText, Menu, MessageSquareText, Plus, Workflow, X } from "lucide-react";

import { ConversationArchive } from "@/components/playground/ConversationArchive";
import { LanguageToggle } from "@/components/site/LanguageToggle";
import { SiteLogo } from "@/components/site/SiteLogo";
import { ThemeToggle } from "@/components/site/ThemeToggle";
import { getDictionary, type Locale } from "@/lib/i18n";
import { requestWorkspaceSection } from "@/lib/workspace-events";

export function MobileChatDrawer({
  open,
  locale,
  onClose,
  onNewChat,
  onOpenArtifacts,
  onOpenRuns,
}: {
  open: boolean;
  locale: Locale;
  onClose: () => void;
  onNewChat: () => void;
  onOpenArtifacts?: () => void;
  onOpenRuns?: () => void;
}) {
  const text = getDictionary(locale);
  const drawerRef = useRef<HTMLDivElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const ru = locale === "ru";

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = requestAnimationFrame(() => drawerRef.current?.focus());

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !drawerRef.current) return;
      const focusable = Array.from(drawerRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ));
      if (!focusable.length) return;
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

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus();
    };
  }, [open]);

  function openFlow() {
    requestWorkspaceSection("flow");
    onClose();
  }

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[120] md:hidden" role="presentation" data-mobile-chat-drawer>
      <button type="button" tabIndex={-1} className="absolute inset-0 rounded-none bg-black/45" aria-label={text.chat.close} onClick={onClose} />
      <div
        ref={drawerRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-chat-drawer-title"
        className="absolute inset-y-0 left-0 flex w-[min(92vw,420px)] flex-col overflow-hidden rounded-none border-r border-outline-variant bg-surface-container-lowest shadow-2xl outline-none"
      >
        <header className="flex min-h-14 shrink-0 items-center justify-between gap-3 border-b border-outline-variant px-4">
          <Link
            href="/"
            onClick={onClose}
            aria-label="TK LAB"
            className="group inline-flex items-center gap-2 rounded-xl p-1 transition hover:opacity-80"
          >
            <SiteLogo showWordmark={true} className="scale-90 origin-left" />
          </Link>
          <button type="button" onClick={onClose} className="grid size-11 shrink-0 place-items-center rounded-full text-on-secondary-container hover:bg-surface-container-low hover:text-primary" aria-label={text.chat.close}><X size={18} /></button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3">
          <button
            type="button"
            onClick={() => { onNewChat(); onClose(); }}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 text-sm font-medium text-on-primary"
          >
            <Plus size={17} />{text.chat.newDialog}
          </button>

          <section className="mt-4 rounded-2xl border border-outline-variant bg-surface p-2" aria-label={ru ? "Рабочие области" : "Workspace areas"} data-motion-card>
            <button type="button" onClick={onClose} className="flex min-h-11 w-full items-center gap-3 rounded-xl bg-surface-container-low px-3 text-left text-sm font-medium text-primary"><MessageSquareText size={17} />{ru ? "Чат" : "Chat"}</button>
            <button type="button" onClick={openFlow} className="mt-1 flex min-h-12 w-full items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-3 text-left text-sm font-medium text-primary hover:bg-primary/10"><Workflow size={17} />Erma Flow<span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-on-primary">new</span></button>
            {onOpenArtifacts && <button type="button" onClick={() => { onOpenArtifacts(); onClose(); }} className="mt-1 flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm text-on-surface-variant hover:bg-surface-container-low"><FileText size={17} />{ru ? "Артефакты" : "Artifacts"}</button>}
            {onOpenRuns && <button type="button" onClick={() => { onOpenRuns(); onClose(); }} className="mt-1 flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm text-on-surface-variant hover:bg-surface-container-low"><Activity size={17} />Agent Runs</button>}
            <Link href="/vault" onClick={onClose} className="mt-1 flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm text-on-surface-variant hover:bg-surface-container-low hover:text-primary"><DatabaseBackup size={17} />Workspace Vault<span className="ml-auto rounded-full border border-outline-variant px-2 py-0.5 text-[9px] uppercase tracking-[0.08em]">local</span></Link>
          </section>

          <ConversationArchive locale={locale} onNavigate={onClose} headingId="mobile-chat-history-title" compact />
        </div>

        <footer className="safe-area-bottom shrink-0 border-t border-outline-variant bg-surface px-3 pb-3 pt-2">
          <div className="flex items-center justify-between gap-2">
            <Link href="/" onClick={onClose} className="flex min-h-11 items-center rounded-xl px-3 text-sm text-on-surface-variant hover:bg-surface-container-low hover:text-primary">TK LAB</Link>
            <div className="flex items-center gap-2">
              <ThemeToggle lightLabel={text.nav.themeLight} darkLabel={text.nav.themeDark} />
              <div className="flex min-h-10 items-center rounded-xl border border-outline-variant bg-surface-container-lowest px-2"><LanguageToggle locale={locale} label={text.nav.language} /></div>
            </div>
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
