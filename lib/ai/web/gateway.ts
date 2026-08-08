const BRAVE_WEB_SEARCH_ENDPOINT = "https://api.search.brave.com/res/v1/web/search";
const MAX_WEB_RESPONSE_BYTES = 600_000;
const MAX_WEB_TEXT_CHARS = 16_000;
const MAX_REDIRECTS = 2;

export type WebSearchResult = {
  id: string;
  title: string;
  url: string;
  description: string;
  age?: string;
};

export type WebSearchSession = Map<string, WebSearchResult>;

type BraveResult = { title?: unknown; url?: unknown; description?: unknown; age?: unknown };
type BravePayload = { web?: { results?: BraveResult[] } };

function privateIpv4(hostname: string) {
  const parts = hostname.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [a, b] = parts;
  return a === 10
    || a === 127
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168)
    || a === 0;
}

function privateIpv6(hostname: string) {
  const normalized = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  return normalized === "::1" || normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe80:");
}

export function validatePublicWebUrl(value: string) {
  let url: URL;
  try { url = new URL(value); } catch { throw new Error("web_url_invalid"); }
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("web_url_protocol_blocked");
  if (url.username || url.password) throw new Error("web_url_credentials_blocked");
  if (url.port && url.port !== "80" && url.port !== "443") throw new Error("web_url_port_blocked");
  const hostname = url.hostname.toLowerCase();
  if (!hostname || hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local") || hostname.endsWith(".internal")) throw new Error("web_url_host_blocked");
  if (privateIpv4(hostname) || privateIpv6(hostname)) throw new Error("web_url_private_ip_blocked");
  return url;
}

function cleanText(value: unknown, max: number) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

function resultId(index: number, url: string) {
  let hash = 2166136261;
  for (const char of url) { hash ^= char.charCodeAt(0); hash = Math.imul(hash, 16777619); }
  return `web-${index + 1}-${(hash >>> 0).toString(36)}`;
}

export async function searchWeb(query: string, language: "ru" | "en", count: number, signal: AbortSignal, session: WebSearchSession) {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY?.trim() || "";
  if (!apiKey) throw new Error("web_search_not_configured");
  const boundedCount = Math.max(1, Math.min(8, Math.trunc(count)));
  const params = new URLSearchParams({
    q: query.slice(0, 400),
    count: String(boundedCount),
    search_lang: language,
    safesearch: "moderate",
  });
  const response = await fetch(`${BRAVE_WEB_SEARCH_ENDPOINT}?${params}`, {
    method: "GET",
    signal,
    cache: "no-store",
    headers: { accept: "application/json", "x-subscription-token": apiKey },
  });
  if (!response.ok) throw new Error(`web_search_http_${response.status}`);
  const payload = await response.json().catch(() => null) as BravePayload | null;
  const rawResults = Array.isArray(payload?.web?.results) ? payload.web.results : [];
  const results: WebSearchResult[] = [];
  for (const [index, item] of rawResults.slice(0, boundedCount).entries()) {
    const title = cleanText(item.title, 220);
    const rawUrl = cleanText(item.url, 2_000);
    const description = cleanText(item.description, 700);
    if (!title || !rawUrl) continue;
    let url: URL;
    try { url = validatePublicWebUrl(rawUrl); } catch { continue; }
    const result = { id: resultId(index, url.href), title, url: url.href, description, ...(cleanText(item.age, 80) ? { age: cleanText(item.age, 80) } : {}) };
    session.set(result.id, result);
    results.push(result);
  }
  return results;
}

async function readTextBounded(response: Response) {
  const body = response.body;
  if (!body) return "";
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = "";
  while (bytes < MAX_WEB_RESPONSE_BYTES && text.length < MAX_WEB_TEXT_CHARS * 3) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > MAX_WEB_RESPONSE_BYTES) break;
    text += decoder.decode(value, { stream: true });
  }
  try { await reader.cancel(); } catch { /* no-op */ }
  return text;
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_match, code) => String.fromCharCode(Number(code)));
}

function htmlToText(html: string) {
  const withoutNoise = html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|svg|iframe)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
  return decodeHtmlEntities(withoutNoise)
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_WEB_TEXT_CHARS);
}

async function fetchPublicPage(url: URL, signal: AbortSignal, redirects = 0): Promise<{ finalUrl: string; contentType: string; text: string }> {
  const response = await fetch(url, {
    method: "GET",
    signal,
    redirect: "manual",
    cache: "no-store",
    headers: {
      accept: "text/html, text/plain;q=0.9, application/xhtml+xml;q=0.8",
      "user-agent": "TK-LAB-Erma-Web-Reader/1.0",
    },
  });
  if ([301, 302, 303, 307, 308].includes(response.status)) {
    if (redirects >= MAX_REDIRECTS) throw new Error("web_open_too_many_redirects");
    const location = response.headers.get("location");
    if (!location) throw new Error("web_open_redirect_without_location");
    const next = validatePublicWebUrl(new URL(location, url).href);
    return fetchPublicPage(next, signal, redirects + 1);
  }
  if (!response.ok) throw new Error(`web_open_http_${response.status}`);
  const contentType = (response.headers.get("content-type") ?? "").toLowerCase();
  if (!contentType.includes("text/html") && !contentType.includes("text/plain") && !contentType.includes("application/xhtml+xml")) throw new Error("web_open_content_type_blocked");
  const raw = await readTextBounded(response);
  const text = contentType.includes("html") || contentType.includes("xhtml") ? htmlToText(raw) : raw.replace(/\s+/g, " ").trim().slice(0, MAX_WEB_TEXT_CHARS);
  return { finalUrl: url.href, contentType, text };
}

export async function openWebResult(resultIdValue: string, signal: AbortSignal, session: WebSearchSession) {
  const result = session.get(resultIdValue);
  if (!result) throw new Error("web_result_not_in_session");
  const url = validatePublicWebUrl(result.url);
  const opened = await fetchPublicPage(url, signal);
  return { result, ...opened };
}
