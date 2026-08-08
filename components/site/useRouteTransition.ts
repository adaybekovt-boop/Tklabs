"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void | Promise<void>) => { finished: Promise<void> };
};

export function shouldAnimateLink(event: ReactMouseEvent<HTMLAnchorElement>) {
  return event.button === 0
    && !event.defaultPrevented
    && !event.metaKey
    && !event.ctrlKey
    && !event.shiftKey
    && !event.altKey;
}

export function useRouteTransition() {
  const router = useRouter();

  return useCallback((href: string, beforeNavigate?: () => void) => {
    beforeNavigate?.();

    if (typeof document === "undefined" || typeof window === "undefined") {
      router.push(href);
      return;
    }

    const root = document.documentElement;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const navigate = () => router.push(href);

    if (reducedMotion) {
      navigate();
      return;
    }

    root.dataset.routeLeaving = "true";
    const transitionDocument = document as ViewTransitionDocument;
    if (typeof transitionDocument.startViewTransition === "function") {
      const transition = transitionDocument.startViewTransition(() => navigate());
      void transition.finished.finally(() => {
        delete root.dataset.routeLeaving;
      });
      return;
    }

    window.setTimeout(navigate, 90);
    window.setTimeout(() => {
      delete root.dataset.routeLeaving;
    }, 520);
  }, [router]);
}
