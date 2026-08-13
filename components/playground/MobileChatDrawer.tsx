"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { MessageSquareText, Plus, X } from "lucide-react";

import { ConversationArchive } from "@/components/playground/ConversationArchive";
import { lockDocumentScroll } from "@/lib/document-scroll-lock";
import { getChatDictionary } from "@/lib/chat-i18n";
import type { Locale } from "@/lib/i18n";

export function MobileChatDrawer({
  open,
  locale,
  onClose,
  onNewChat,
}: {
  open: boolean;
  locale: Locale;
  onClose: () => void;
  onNewChat: () => void;
  onOpenArtifacts?: () => void;
  onOpenRuns?: () => void;
}) {
  const text = getChatDictionary(locale);
  const drawerRef = useRef<HTMLDivElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const swipeRef = useRef<{ x: number; y: number } | null>(null);
  const ru = locale === "ru";

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    const mobileViewport = window.matchMedia("(max-width: 767px)");
    if (!mobileViewport.matches) return;

    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const releaseScrollLock = lockDocumentScroll();
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

    function handleViewportChange(event: MediaQueryListEvent) {
      if (!event.matches) onCloseRef.current();
    }

    document.addEventListener("keydown", handleKeyDown);
    mobileViewport.addEventListener("change", handleViewportChange);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", handleKeyDown);
      mobileViewport.removeEventListener("change", handleViewportChange);
      releaseScrollLock();
      previousFocusRef.current?.focus();
    };
  }, [open]);

  function handleTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    const touch = event.touches[0];
    swipeRef.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
  }

  function handleTouchEnd(event: React.TouchEvent<HTMLDivElement>) {
    const start = swipeRef.current;
    const touch = event.changedTouches[0];
    swipeRef.current = null;
    if (!start || !touch) return;
    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    if (deltaX < -72 && Math.abs(deltaY) < 60) onClose();
  }

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[190] h-[100dvh] overflow-hidden md:hidden" role="presentation" data-mobile-chat-drawer>
      <button type="button" tabIndex={-1} className="absolute inset-0 rounded-none bg-black/45" aria-label={text.chat.close} onClick={onClose} />
      <div
        ref={drawerRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-chat-drawer-title"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="safe-area-bottom absolute inset-y-0 left-0 flex w-[min(88vw,380px)] touch-pan-y flex-col overflow-hidden rounded-none border-r border-outline-variant bg-surface-container-lowest shadow-2xl outline-none"
      >
        <header className="flex min-h-16 shrink-0 items-center justify-between gap-3 border-b border-outline-variant px-4 pt-[env(safe-area-inset-top,0px)]">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface-container-low text-primary"><MessageSquareText size={17} /></span>
            <div className="min-w-0"><p className="label-caps text-on-secondary-container">ERMA</p><h2 id="mobile-chat-drawer-title" className="truncate text-sm font-medium text-primary">{ru ? "Диалоги" : "Conversations"}</h2></div>
          </div>
          <button type="button" onClick={onClose} className="grid size-11 shrink-0 place-items-center rounded-full text-on-secondary-container hover:bg-surface-container-low hover:text-primary" aria-label={text.chat.close}><X size={18} /></button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3">
          <button type="button" onClick={() => { onNewChat(); onClose(); }} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 text-sm font-medium text-on-primary">
            <Plus size={17} />{text.chat.newDialog}
          </button>

          <div className="mt-4">
            <ConversationArchive locale={locale} onNavigate={onClose} headingId="mobile-chat-history-title" compact />
          </div>
        </div>

      </div>
    </div>,
    document.body,
  );
}
