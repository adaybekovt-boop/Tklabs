import { buildGroundedSearchQueries, rankGroundedResults, sanitizeSearchQuery, type GroundingLanguage } from "@/lib/ai/intelligence/grounding";

const BRAVE_WEB_SEARCH_ENDPOINT = "https://api.search.brave.com/res/v1/web/search";
const GOOGLE_CUSTOM_SEARCH_ENDPOINT = "https://www.googleapis.com/customsearch/v1";
const GOOGLE_GROUNDING_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/interactions";
const MAX_WEB_RESPONSE_BYTES = 600_000;
const MAX_WEB_TEXT_CHARS = 16_000;
const MAX_REDIRECTS = 2;

export type WebSearchProvider = "google-grounding" | "google-custom-search" | "brave";
export type WebSearchResult = {
  id: string;
  title: string;
  url: string;
  description: string;
  age?: string;
  provider: WebSearchProvider;
};

export type WebSearchSession = Map<string, WebSearchResult>;

type BraveResult = { title?: unknown; url?: unknown; description?: unknown; age?: unknown };
type BravePayload = { web?: { results?: BraveResult[] } };
type GoogleCustomItem = { title?: unknown; link?: unknown; snippet?: unknown };
type GoogleCustomPayload = { items?: GoogleCustomItem[] };
type GoogleAnnotation = { type?: unknown; url?: unknown; title?: unknown; start_index?: unknown; end_index?: unknown; startIndex?: unknown; endIndex?: unknown };
type GoogleContentBlock = { type?: unknown; text?: unknown; annotations?: unknown };
type GoogleInteractionStep = { type?: unknown; content?: unknown };
type GoogleInteractionPayload = { steps?: GoogleInteractionStep[] };

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

function resultId(url: string) {
  let hash = 2166136261;
  for (const char of url) { hash ^= char.charCodeAt(0); hash = Math.imul(hash, 16777619); }
  return `web-${(hash >>> 0).toString(36)}`;
}

function safeResult(provider: WebSearchProvider, titleValue: unknown, urlValue: unknown, descriptionValue: unknown, ageValue?: unknown): WebSearchResult | null {
  const title = cleanText(titleValue, 220);
  const rawUrl = cleanText(urlValue, 2_000);
  const description = cleanText(descriptionValue, 900);
  if (!title || !rawUrl) return null;
  let url: URL;
  try { url = validatePublicWebUrl(rawUrl); } catch { return null; }
  const age = cleanText(ageValue, 80);
  return { id: resultId(url.href), title, url: url.href, description, ...(age ? { age } : {}), provider };
}

function googleGroundingKey() {
  return process.env.GOOGLE_GEMINI_API_KEY?.trim() || process.env.GEMINI_API_KEY?.trim() || "";
}

async function searchGoogleGrounding(query: string, count: number, signal: AbortSignal) {
  const apiKey = googleGroundingKey();
  if (!apiKey) throw new Error("google_grounding_not_configured");
  const model = process.env.GOOGLE_GROUNDING_MODEL?.trim() || "gemini-3.5-flash-lite";
  const response = await fetch(GOOGLE_GROUNDING_ENDPOINT, {
    method: "POST",
    signal,
    cache: "no-store",
    headers: { "content-type": "application/json", accept: "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      model,
      input: `Search the public web for authoritative evidence relevant to this query. Resolve ambiguous named entities before answering. Prefer primary or official sources where appropriate. Query: ${query}`,
      tools: [{ type: "google_search" }],
    }),
  });
  if (!response.ok) throw new Error(`google_grounding_http_${response.status}`);
  const payload = await response.json().catch(() => null) as GoogleInteractionPayload | null;
  const results: WebSearchResult[] = [];
  for (const step of Array.isArray(payload?.steps) ? payload.steps : []) {
    if (step?.type !== "model_output" || !Array.isArray(step.content)) continue;
    for (const rawBlock of step.content) {
      const block = rawBlock as GoogleContentBlock;
      if (block?.type !== "text" || typeof block.text !== "string" || !Array.isArray(block.annotations)) continue;
      for (const rawAnnotation of block.annotations) {
        const annotation = rawAnnotation as GoogleAnnotation;
        if (annotation?.type !== "url_citation") continue;
        const start = Number(annotation.start_index ?? annotation.startIndex ?? 0);
        const end = Number(annotation.end_index ?? annotation.endIndex ?? Math.min(block.text.length, start + 700));
        const cited = Number.isFinite(start) && Number.isFinite(end) && end > start ? block.text.slice(Math.max(0, start), Math.min(block.text.length, end)) : block.text;
        const rawUrl = cleanText(annotation.url, 2_000);
        let fallbackTitle = "Google Search source";
        try { fallbackTitle = new URL(rawUrl).hostname.replace(/^www\./, ""); } catch { /* ignored */ }
        const result = safeResult("google-grounding", cleanText(annotation.title, 220) || fallbackTitle, rawUrl, cited);
        if (result && !results.some((entry) => entry.url === result.url)) results.push(result);
        if (results.length >= count) return results;
      }
    }
  }
  if (!results.length) throw new Error("google_grounding_no_citations");
  return results;
}

async function searchGoogleCustom(query: string, count: number, signal: AbortSignal) {
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY?.trim() || "";
  const cx = process.env.GOOGLE_SEARCH_CX?.trim() || "";
  if (!apiKey || !cx) throw new Error("google_custom_search_not_configured");
  const params = new URLSearchParams({ key: apiKey, cx, q: query, num: String(Math.max(1, Math.min(10, count))), safe: "active" });
  const response = await fetch(`${GOOGLE_CUSTOM_SEARCH_ENDPOINT}?${params}`, { method: "GET", signal, cache: "no-store", headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(`google_custom_search_http_${response.status}`);
  const payload = await response.json().catch(() => null) as GoogleCustomPayload | null;
  return (Array.isArray(payload?.items) ? payload.items : []).map((item) => safeResult("google-custom-search", item.title, item.link, item.snippet)).filter((item): item is WebSearchResult => Boolean(item));
}

async function searchBrave(query: string, count: number, language: GroundingLanguage, signal: AbortSignal) {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY?.trim() || "";
  if (!apiKey) throw new Error("brave_search_not_configured");
  const params = new URLSearchParams({ q: query, count: String(Math.max(1, Math.min(8, count))), search_lang: language, safesearch: "moderate" });
  const response = await fetch(`${BRAVE_WEB_SEARCH_ENDPOINT}?${params}`, { method: "GET", signal, cache: "no-store", headers: { accept: "application/json", "x-subscription-token": apiKey } });
  if (!response.ok) throw new Error(`brave_search_http_${response.status}`);
  const payload = await response.json().catch(() => null) as BravePayload | null;
  const rawResults = Array.isArray(payload?.web?.results) ? payload.web.results : [];
  return rawResults.map((item) => safeResult("brave", item.title, item.url, item.description, item.age)).filter((item): item is WebSearchResult => Boolean(item));
}

async function searchFallbackProvider(provider: "google-custom-search" | "brave", queries: readonly string[], count: number, language: GroundingLanguage, signal: AbortSignal) {
  const merged: WebSearchResult[] = [];
  for (const query of queries) {
    const batch = provider === "google-custom-search" ? await searchGoogleCustom(query, count, signal) : await searchBrave(query, count, language, signal);
    for (const result of batch) if (!merged.some((entry) => entry.url === result.url)) merged.push(result);
    if (merged.length >= count * 2) break;
  }
  return merged;
}

export async function searchWeb(query: string, language: GroundingLanguage, count: number, signal: AbortSignal, session: WebSearchSession) {
  const boundedCount = Math.max(1, Math.min(8, Math.trunc(count)));
  const sanitized = sanitizeSearchQuery(query);
  if (!sanitized) throw new Error("web_search_query_empty");
  const queries = buildGroundedSearchQueries(sanitized, language);
  let results: WebSearchResult[] = [];
  let lastError: unknown;

  if (googleGroundingKey()) {
    try { results = await searchGoogleGrounding(queries[0] ?? sanitized, boundedCount, signal); }
    catch (error) { lastError = error; }
  }
  if (!results.length && process.env.GOOGLE_SEARCH_API_KEY?.trim() && process.env.GOOGLE_SEARCH_CX?.trim()) {
    try { results = await searchFallbackProvider("google-custom-search", queries, boundedCount, language, signal); }
    catch (error) { lastError = error; }
  }
  if (!results.length && process.env.BRAVE_SEARCH_API_KEY?.trim()) {
    try { results = await searchFallbackProvider("brave", queries, boundedCount, language, signal); }
    catch (error) { lastError = error; }
  }
  if (!results.length) throw lastError ?? new Error("web_search_not_configured");

  const ranked = rankGroundedResults(sanitized, results).slice(0, boundedCount);
  for (const result of ranked) session.set(result.id, result);
  return ranked;
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

function metaContent(html: string, names: readonly string[]) {
  for (const name of names) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const patterns = [
      new RegExp(`<meta[^>]+(?:name|property)=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"),
      new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']${escaped}["'][^>]*>`, "i"),
    ];
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match?.[1]) return decodeHtmlEntities(match[1]).replace(/\s+/g, " ").trim().slice(0, 300);
    }
  }
  return "";
}

function stripHtml(value: string) {
  return decodeHtmlEntities(value
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|svg|iframe|nav|footer|header|form|aside)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/tr|\/section|\/article)>/gi, "\n")
    .replace(/<[^>]+>/g, " "))
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function readableHtml(html: string) {
  const title = stripHtml(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").slice(0, 240);
  const publishedAt = metaContent(html, ["article:published_time", "datePublished", "date", "pubdate"]);
  const description = metaContent(html, ["description", "og:description"]);
  const primary = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1]
    ?? html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)?.[1]
    ?? html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1]
    ?? html;
  const text = stripHtml(primary).slice(0, MAX_WEB_TEXT_CHARS);
  return { title, publishedAt, description, text };
}

async function fetchPublicPage(url: URL, signal: AbortSignal, redirects = 0): Promise<{ finalUrl: string; contentType: string; text: string; pageTitle: string; publishedAt: string; description: string }> {
  const response = await fetch(url, {
    method: "GET",
    signal,
    redirect: "manual",
    cache: "no-store",
    headers: { accept: "text/html, text/plain;q=0.9, application/xhtml+xml;q=0.8", "user-agent": "TK-LAB-Erma-Web-Reader/1.1" },
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
  if (contentType.includes("html") || contentType.includes("xhtml")) {
    const readable = readableHtml(raw);
    return { finalUrl: url.href, contentType, text: readable.text, pageTitle: readable.title, publishedAt: readable.publishedAt, description: readable.description };
  }
  return { finalUrl: url.href, contentType, text: raw.replace(/\s+/g, " ").trim().slice(0, MAX_WEB_TEXT_CHARS), pageTitle: "", publishedAt: "", description: "" };
}

export async function openWebResult(resultIdValue: string, signal: AbortSignal, session: WebSearchSession) {
  const result = session.get(resultIdValue);
  if (!result) throw new Error("web_result_not_in_session");
  const url = validatePublicWebUrl(result.url);
  const opened = await fetchPublicPage(url, signal);
  return { result, ...opened };
}
