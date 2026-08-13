"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const REVEAL_SELECTOR = [
  "main > section",
  "main > div > section",
  "[data-motion-section]",
  ".editorial-card",
  "[data-motion-card]",
].join(",");

function revealImmediately(node: Element, order: number) {
  if (!(node instanceof HTMLElement)) return;
  node.dataset.motionReveal = "";
  node.dataset.motionState = "visible";
  node.style.setProperty("--motion-order", String(order % 8));
}

export function MotionOrchestrator() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.motion = "ready";

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const tracked = new WeakSet<Element>();
    let order = 0;

    const observer = reducedMotion
      ? null
      : new IntersectionObserver((entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            const node = entry.target as HTMLElement;
            node.dataset.motionState = "visible";
            observer?.unobserve(node);
          }
        }, { rootMargin: "0px 0px -7%", threshold: 0.06 });

    function register(node: Element) {
      if (!(node instanceof HTMLElement) || tracked.has(node)) return;
      tracked.add(node);
      node.dataset.motionReveal = "";
      node.style.setProperty("--motion-order", String(order % 8));
      order += 1;
      if (reducedMotion) revealImmediately(node, order);
      else observer?.observe(node);
    }

    function scan(scope: ParentNode = document) {
      scope.querySelectorAll(REVEAL_SELECTOR).forEach(register);
    }

    scan();

    const pendingScopes = new Set<Element>();
    let scanFrame = 0;
    const flushPendingScopes = () => {
      scanFrame = 0;
      for (const scope of pendingScopes) {
        if (scope.matches(REVEAL_SELECTOR)) register(scope);
        scan(scope);
      }
      pendingScopes.clear();
    };
    const scheduleScan = (scope: Element) => {
      pendingScopes.add(scope);
      if (!scanFrame) scanFrame = requestAnimationFrame(flushPendingScopes);
    };
    const mutationObserver = new MutationObserver((records) => {
      for (const record of records) {
        for (const addedNode of record.addedNodes) {
          if (!(addedNode instanceof Element)) continue;
          scheduleScan(addedNode);
        }
      }
    });
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer?.disconnect();
      mutationObserver.disconnect();
      if (scanFrame) cancelAnimationFrame(scanFrame);
      pendingScopes.clear();
      delete root.dataset.motion;
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.routeTransition = "entering";
    const timer = window.setTimeout(() => {
      if (root.dataset.routeTransition === "entering") delete root.dataset.routeTransition;
    }, 420);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  useEffect(() => {
    const root = document.documentElement;
    let cleanupTimer = 0;

    function handleNavigationIntent(event: MouseEvent) {
      if (
        event.defaultPrevented
        || event.button !== 0
        || event.metaKey
        || event.ctrlKey
        || event.shiftKey
        || event.altKey
      ) return;

      const source = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!source || source.target || source.hasAttribute("download")) return;

      const next = new URL(source.href, window.location.href);
      if (next.origin !== window.location.origin) return;
      const current = new URL(window.location.href);
      const routeChanged = next.pathname !== current.pathname || next.search !== current.search;
      if (!routeChanged) return;

      root.dataset.routeTransition = "leaving";
      window.clearTimeout(cleanupTimer);
      cleanupTimer = window.setTimeout(() => {
        if (root.dataset.routeTransition === "leaving") delete root.dataset.routeTransition;
      }, 700);
    }

    document.addEventListener("click", handleNavigationIntent, true);
    return () => {
      document.removeEventListener("click", handleNavigationIntent, true);
      window.clearTimeout(cleanupTimer);
    };
  }, []);

  return null;
}
