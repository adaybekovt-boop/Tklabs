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
