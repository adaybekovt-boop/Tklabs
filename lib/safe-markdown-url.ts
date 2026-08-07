const SAFE_ABSOLUTE_PROTOCOL = /^(?:https?:|mailto:)/i;
const SAFE_RELATIVE_TARGET = /^(?:\/|#|\?)/;

export function safeMarkdownUrl(url: string) {
  const normalized = url.trim();
  if (SAFE_ABSOLUTE_PROTOCOL.test(normalized)) return normalized;
  if (SAFE_RELATIVE_TARGET.test(normalized)) return normalized;
  return "#blocked-url";
}
