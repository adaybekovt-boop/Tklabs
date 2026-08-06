"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

let bodyLockCount = 0;
let bodyOverflowBeforeLock = "";

function lockBodyScroll() {
  if (bodyLockCount === 0) {
    bodyOverflowBeforeLock = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  bodyLockCount += 1;
}

function unlockBodyScroll() {
  bodyLockCount = Math.max(0, bodyLockCount - 1);
  if (bodyLockCount === 0) document.body.style.overflow = bodyOverflowBeforeLock;
}

export function ChatOverlay({
  open,
  onClose,
  labelledBy,
  children,
  className,
  position = "sheet",
  closeLabel = "Close",
}: {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  children: ReactNode;
  className?: string;
  position?: "sheet" | "popover" | "responsive";
  closeLabel?: string;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    lockBodyScroll();

    const focusFrame = requestAnimationFrame(() => {
      const firstFocusable = dialogRef.current?.querySelector<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      (firstFocusable ?? dialogRef.current)?.focus();
    });

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ));
      if (focusable.length === 0) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === dialogRef.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || active === dialogRef.current)) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", onKeyDown);
      unlockBodyScroll();
      previousFocusRef.current?.focus();
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[100]" role="presentation" data-chat-overlay="true">
      <button type="button" tabIndex={-1} className="absolute inset-0 rounded-none bg-black/45 backdrop-blur-[2px]" aria-label={closeLabel} onClick={onClose} />
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        onTouchStart={(event) => {
          const touch = event.touches[0];
          touchStartRef.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
        }}
        onTouchEnd={(event) => {
          const start = touchStartRef.current;
          const touch = event.changedTouches[0];
          touchStartRef.current = null;
          if (!start || !touch || window.innerWidth >= 768) return;
          const deltaX = touch.clientX - start.x;
          const deltaY = touch.clientY - start.y;
          if (deltaY > 72 && Math.abs(deltaX) < 80) onClose();
        }}
        className={cn(
          "chat-overlay-panel absolute max-h-[min(86dvh,720px)] overflow-y-auto border border-outline-variant bg-surface-container-lowest p-4 shadow-2xl outline-none sm:p-5",
          position === "sheet"
            ? "inset-x-0 bottom-0 rounded-t-[2rem] pb-[max(1.25rem,env(safe-area-inset-bottom))] md:inset-x-4 md:bottom-4 md:mx-auto md:max-w-xl md:rounded-[2rem]"
            : position === "popover"
              ? "left-3 right-3 top-20 mx-auto max-w-xl rounded-[2rem] md:left-auto md:right-6 md:mx-0 md:w-[380px]"
              : "inset-x-0 bottom-0 rounded-t-[2rem] pb-[max(1.25rem,env(safe-area-inset-bottom))] md:bottom-auto md:left-auto md:right-6 md:top-20 md:mx-0 md:w-[380px] md:rounded-[2rem]",
          className,
        )}
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-outline-variant md:hidden" aria-hidden="true" />
        {children}
      </div>
    </div>,
    document.body,
  );
}
