import { parseJsonBody, RequestBodyTooLargeError } from "@/lib/request-body";

export const runtime = "edge";

const CSP_REPORT_LIMIT_BYTES = 16 * 1024;
const MAX_FIELD_LENGTH = 2_000;

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

export async function POST(request: Request) {
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
