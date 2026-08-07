import { parseJsonBody, RequestBodyTooLargeError } from "@/lib/request-body";

export const runtime = "edge";

const CSP_REPORT_LIMIT_BYTES = 16 * 1024;
const MAX_FIELD_LENGTH = 2_000;
const CSP_REPORT_WINDOW_MS = 60_000;
const CSP_REPORTS_PER_WINDOW = 20;
const MAX_RATE_BUCKETS = 1_024;

type RateBucket = { windowStart: number; count: number };
const reportBuckets = new Map<string, RateBucket>();

function boundedString(value: unknown) {
  return typeof value === "string" ? value.slice(0, MAX_FIELD_LENGTH) : undefined;
}

function sanitizeReport(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as Record<string, unknown>;
  const candidate = root["csp-report"] ?? root.body ?? root;
  if (!candidate || typeof candidate !== "object") return null;
  const report = candidate as Record<string, unknown>;
  return {
    blockedUri: boundedString(report["blocked-uri"] ?? report.blockedURL),
    documentUri: boundedString(report["document-uri"] ?? report.documentURL),
    effectiveDirective: boundedString(report["effective-directive"] ?? report.effectiveDirective),
    violatedDirective: boundedString(report["violated-directive"] ?? report.violatedDirective),
    sourceFile: boundedString(report["source-file"] ?? report.sourceFile),
    lineNumber: typeof report["line-number"] === "number" ? report["line-number"] : undefined,
    disposition: boundedString(report.disposition),
  };
}

function reportIdentity(request: Request) {
  const cloudflareRequest = request as Request & { cf?: unknown };
  const connectingIp = request.headers.get("cf-connecting-ip")?.trim();
  return connectingIp && cloudflareRequest.cf !== undefined ? `ip:${connectingIp}` : "unknown";
}

function pruneRateBuckets(now: number) {
  for (const [key, bucket] of reportBuckets) {
    if (now - bucket.windowStart >= CSP_REPORT_WINDOW_MS) reportBuckets.delete(key);
  }
  while (reportBuckets.size >= MAX_RATE_BUCKETS) {
    const oldest = reportBuckets.keys().next().value as string | undefined;
    if (!oldest) break;
    reportBuckets.delete(oldest);
  }
}

function allowReport(request: Request, now = Date.now()) {
  const identity = reportIdentity(request);
  const current = reportBuckets.get(identity);
  if (!current || now - current.windowStart >= CSP_REPORT_WINDOW_MS) {
    if (reportBuckets.size >= MAX_RATE_BUCKETS) pruneRateBuckets(now);
    reportBuckets.set(identity, { windowStart: now, count: 1 });
    return true;
  }
  if (current.count >= CSP_REPORTS_PER_WINDOW) return false;
  current.count += 1;
  return true;
}

export async function POST(request: Request) {
  // Silently discard excess browser reports. Returning 204 avoids retries while
  // bounding log amplification and JSON parsing work per client/isolate.
  if (!allowReport(request)) return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });

  try {
    const payload = await parseJsonBody<unknown>(request, CSP_REPORT_LIMIT_BYTES);
    const report = sanitizeReport(payload);
    if (!report) return new Response(null, { status: 400, headers: { "cache-control": "no-store" } });
    console.warn("security.csp_violation", report);
    return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return new Response(null, { status: 413, headers: { "cache-control": "no-store" } });
    }
    return new Response(null, { status: 400, headers: { "cache-control": "no-store" } });
  }
}
