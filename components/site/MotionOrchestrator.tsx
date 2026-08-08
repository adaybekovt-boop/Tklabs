"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

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

function isPlainInternalNavigation(event: MouseEvent, anchor: HTMLAnchorElement) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
  if (anchor.target && anchor.target !== "_self") return false;
  if (anchor.hasAttribute("download")) return false;

  const url = new URL(anchor.href, window.location.href);
  if (url.origin !== window.location.origin) return false;
  if (url.pathname === window.location.pathname && url.search === window.location.search && url.hash) return false;
  return true;
}

export function MotionOrchestrator() {
  const pathname = usePathname();
  const hasMountedPathRef = useRef(false);

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

    function markNavigationStart(event: MouseEvent) {
      if (reducedMotion) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest<HTMLAnchorElement>("a[href]");
      if (!anchor || !isPlainInternalNavigation(event, anchor)) return;
      root.dataset.routeLeaving = "true";
    }

    scan();
    document.addEventListener("click", markNavigationStart, true);

    const mutationObserver = new MutationObserver((records) => {
      for (const record of records) {
        for (const addedNode of record.addedNodes) {
          if (!(addedNode instanceof Element)) continue;
          if (addedNode.matches(REVEAL_SELECTOR)) register(addedNode);
          scan(addedNode);
        }
      }
    });
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer?.disconnect();
      mutationObserver.disconnect();
      document.removeEventListener("click", markNavigationStart, true);
      delete root.dataset.motion;
      delete root.dataset.routeLeaving;
      delete root.dataset.routeEntering;
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (!hasMountedPathRef.current) {
      hasMountedPathRef.current = true;
      delete root.dataset.routeLeaving;
      delete root.dataset.routeEntering;
      return;
    }

    delete root.dataset.routeLeaving;
    root.dataset.routeEntering = "true";
    const timer = window.setTimeout(() => {
      delete root.dataset.routeEntering;
    }, 420);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  return null;
}
