"use client";

import { useEffect } from "react";

const CHAT_VISUAL_HEIGHT = "--chat-visual-height";

export function useVisualViewport() {
  useEffect(() => {
    const viewport = window.visualViewport;
    const mobileQuery = window.matchMedia("(max-width: 767px), (pointer: coarse)");
    let frame = 0;

    function clearHeight() {
      cancelAnimationFrame(frame);
      document.documentElement.style.removeProperty(CHAT_VISUAL_HEIGHT);
    }

    function updateHeight() {
      cancelAnimationFrame(frame);
      if (!viewport || !mobileQuery.matches) {
        document.documentElement.style.removeProperty(CHAT_VISUAL_HEIGHT);
        return;
      }
      frame = requestAnimationFrame(() => {
        document.documentElement.style.setProperty(CHAT_VISUAL_HEIGHT, `${Math.round(viewport.height)}px`);
      });
    }

    updateHeight();
    mobileQuery.addEventListener("change", updateHeight);
    viewport?.addEventListener("resize", updateHeight, { passive: true });

    return () => {
      mobileQuery.removeEventListener("change", updateHeight);
      viewport?.removeEventListener("resize", updateHeight);
      clearHeight();
    };
  }, []);
}
