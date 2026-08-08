"use client";

import { useEffect } from "react";

const VARIABLES = [
  "--chat-visual-height",
  "--chat-visual-width",
  "--chat-visual-offset-top",
  "--chat-keyboard-inset",
] as const;

export function useVisualViewport() {
  useEffect(() => {
    const viewport = window.visualViewport;
    const mobileQuery = window.matchMedia("(max-width: 767px), (pointer: coarse)");
    let frame = 0;

    function clear() {
      cancelAnimationFrame(frame);
      for (const variable of VARIABLES) document.documentElement.style.removeProperty(variable);
    }

    function update() {
      cancelAnimationFrame(frame);
      if (!viewport || !mobileQuery.matches) {
        clear();
        return;
      }
      frame = requestAnimationFrame(() => {
        const visualHeight = Math.max(1, Math.round(viewport.height));
        const visualWidth = Math.max(1, Math.round(viewport.width));
        const offsetTop = Math.max(0, Math.round(viewport.offsetTop));
        const keyboardInset = Math.max(0, Math.round(window.innerHeight - viewport.height - viewport.offsetTop));
        const root = document.documentElement.style;
        root.setProperty("--chat-visual-height", `${visualHeight}px`);
        root.setProperty("--chat-visual-width", `${visualWidth}px`);
        root.setProperty("--chat-visual-offset-top", `${offsetTop}px`);
        root.setProperty("--chat-keyboard-inset", `${keyboardInset}px`);
      });
    }

    update();
    mobileQuery.addEventListener("change", update);
    viewport?.addEventListener("resize", update, { passive: true });
    viewport?.addEventListener("scroll", update, { passive: true });
    window.addEventListener("orientationchange", update, { passive: true });

    return () => {
      mobileQuery.removeEventListener("change", update);
      viewport?.removeEventListener("resize", update);
      viewport?.removeEventListener("scroll", update);
      window.removeEventListener("orientationchange", update);
      clear();
    };
  }, []);
}
