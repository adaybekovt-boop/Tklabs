"use client";

import { useEffect } from "react";

const LEGACY_API_ROUTE = /\/api\/clodex\b/gi;
const LEGACY_PROVIDER_NAME = /\bclodex\b/gi;

function neutralize(value: string) {
  return value
    .replace(LEGACY_API_ROUTE, "/api/external-api")
    .replace(LEGACY_PROVIDER_NAME, "External API");
}

function neutralizeNode(node: Node) {
  if (node.nodeType === Node.TEXT_NODE) {
    if (!node.nodeValue) return;
    const next = neutralize(node.nodeValue);
    if (next !== node.nodeValue) node.nodeValue = next;
    return;
  }
  if (!(node instanceof Element)) return;

  const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();
  while (current) {
    if (current.nodeValue) {
      const next = neutralize(current.nodeValue);
      if (next !== current.nodeValue) current.nodeValue = next;
    }
    current = walker.nextNode();
  }

  for (const element of [node, ...node.querySelectorAll("[aria-label], [title]")]) {
    for (const attribute of ["aria-label", "title"] as const) {
      const value = element.getAttribute(attribute);
      if (!value) continue;
      const next = neutralize(value);
      if (next !== value) element.setAttribute(attribute, next);
    }
  }
}

export function PublicBrandingGuard() {
  useEffect(() => {
    neutralizeNode(document.documentElement);

    const pending = new Set<Node>();
    let frame = 0;
    const flush = () => {
      frame = 0;
      for (const node of pending) neutralizeNode(node);
      pending.clear();
    };
    const schedule = (node: Node) => {
      pending.add(node);
      if (!frame) frame = requestAnimationFrame(flush);
    };
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === "characterData") schedule(record.target);
        for (const node of record.addedNodes) schedule(node);
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
      pending.clear();
    };
  }, []);

  return null;
}
