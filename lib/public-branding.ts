import { dictionaries } from "@/lib/i18n";

const LEGACY_API_ROUTE = /\/api\/clodex\b/gi;
const LEGACY_PROVIDER_NAME = /\bclodex\b/gi;

export function neutralizeProviderBranding(value: string) {
  return value
    .replace(LEGACY_API_ROUTE, "/api/external-api")
    .replace(LEGACY_PROVIDER_NAME, "External API");
}

function neutralizeDictionaryNode(node: unknown): void {
  if (Array.isArray(node)) {
    for (let index = 0; index < node.length; index += 1) {
      const value = node[index] as unknown;
      if (typeof value === "string") node[index] = neutralizeProviderBranding(value);
      else neutralizeDictionaryNode(value);
    }
    return;
  }
  if (!node || typeof node !== "object") return;

  const record = node as Record<string, unknown>;
  for (const [key, value] of Object.entries(record)) {
    if (typeof value === "string") record[key] = neutralizeProviderBranding(value);
    else neutralizeDictionaryNode(value);
  }
}

/**
 * Product copy must expose TK LAB concepts, not the name of a legacy upstream
 * integration. Internal storage identifiers remain untouched for migration
 * safety, while every dictionary string is neutralized before rendering.
 */
for (const dictionary of Object.values(dictionaries)) neutralizeDictionaryNode(dictionary);

function neutralizeAddedNode(node: Node) {
  if (node.nodeType === Node.TEXT_NODE && node.nodeValue) {
    const neutral = neutralizeProviderBranding(node.nodeValue);
    if (neutral !== node.nodeValue) node.nodeValue = neutral;
    return;
  }
  if (!(node instanceof Element)) return;

  const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();
  while (current) {
    if (current.nodeValue) {
      const neutral = neutralizeProviderBranding(current.nodeValue);
      if (neutral !== current.nodeValue) current.nodeValue = neutral;
    }
    current = walker.nextNode();
  }

  for (const element of [node, ...node.querySelectorAll("[aria-label], [title]")]) {
    for (const attribute of ["aria-label", "title"] as const) {
      const value = element.getAttribute(attribute);
      if (!value) continue;
      const neutral = neutralizeProviderBranding(value);
      if (neutral !== value) element.setAttribute(attribute, neutral);
    }
  }
}

// A few legacy client components still carry storage-compatible labels in
// source. New overlays are neutralized in the same microtask in which React
// inserts them, keeping the legacy provider name out of the rendered product.
if (typeof document !== "undefined" && typeof MutationObserver !== "undefined") {
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === "characterData") neutralizeAddedNode(record.target);
      for (const node of record.addedNodes) neutralizeAddedNode(node);
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
}
