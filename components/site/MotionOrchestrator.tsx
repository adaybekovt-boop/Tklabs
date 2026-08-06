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
      delete root.dataset.motion;
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.routeTransition = "true";
    const frame = requestAnimationFrame(() => {
      delete root.dataset.routeTransition;
    });
    return () => cancelAnimationFrame(frame);
  }, [pathname]);

  return null;
}
