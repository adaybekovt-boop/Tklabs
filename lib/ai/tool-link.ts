export function isSafeToolLink(href: string, toolName: string) {
  // Reject, rather than truncate, a URL whose destination cannot be preserved.
  if (!href || href.length > 2_000 || /[\u0000-\u0020\u007f\\]/.test(href)) return false;
  if (href.startsWith("/")) return !href.startsWith("//");
  const allowExternal = toolName === "search_web" || toolName === "open_web_result";
  if (!allowExternal || !/^https?:\/\//i.test(href)) return false;
  try {
    const url = new URL(href);
    return Boolean(url.hostname) && !url.username && !url.password;
  } catch {
    return false;
  }
}

