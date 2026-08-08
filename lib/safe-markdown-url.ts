const SAFE_ABSOLUTE_PROTOCOL = /^(?:https?:|mailto:)/i;

export function safeMarkdownUrl(url: string) {
  const normalized = url.trim();
  if (SAFE_ABSOLUTE_PROTOCOL.test(normalized)) return normalized;
  if (normalized.startsWith("/") && !normalized.startsWith("//")) return normalized;
  if (normalized.startsWith("#") || normalized.startsWith("?")) return normalized;
  return "#blocked-url";
}
