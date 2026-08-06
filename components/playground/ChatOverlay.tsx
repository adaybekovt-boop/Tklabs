"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function ChatOverlay({
  open,
  onClose,
  labelledBy,
  children,
  className,
  position = "sheet",
}: {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  children: ReactNode;
  className?: string;
  position?: "sheet" | "popover" | "responsive";
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => dialogRef.current?.focus());

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

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100]" role="presentation">
      <button type="button" className="absolute inset-0 bg-primary/45 backdrop-blur-[2px]" aria-label="Close" onClick={onClose} />
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={cn(
          "chat-overlay-panel absolute max-h-[min(86dvh,720px)] overflow-y-auto border border-outline-variant bg-surface-container-lowest p-4 shadow-2xl outline-none sm:p-5",
          position === "sheet" ? "inset-x-0 bottom-0 rounded-t-[2rem] pb-[max(1.25rem,env(safe-area-inset-bottom))] md:inset-x-4 md:bottom-4 md:mx-auto md:max-w-xl md:rounded-[2rem]" : position === "popover" ? "left-3 right-3 top-20 mx-auto max-w-xl rounded-[2rem] md:left-auto md:right-6 md:mx-0 md:w-[380px]" : "inset-x-0 bottom-0 rounded-t-[2rem] pb-[max(1.25rem,env(safe-area-inset-bottom))] md:bottom-auto md:left-auto md:right-6 md:top-20 md:mx-0 md:w-[380px] md:rounded-[2rem]",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}
