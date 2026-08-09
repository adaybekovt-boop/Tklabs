import { isTrustedRequestOrigin } from "@/lib/request-security";
import { getSupportAvailability, revealSupportMethod, type SupportMethod } from "@/lib/support-config";

export const runtime = "edge";

const headers = {
  "Cache-Control": "private, no-store, max-age=0",
  "Content-Type": "application/json; charset=utf-8",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
} as const;

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers });
}

function isMethod(value: unknown): value is SupportMethod {
  return value === "kaspi" || value === "bank";
}

export async function GET() {
  return json(getSupportAvailability());
}

export async function POST(request: Request) {
  if (!isTrustedRequestOrigin(request)) return json({ error: "Request origin is not allowed." }, 403);
  let body: { method?: unknown } = {};
  try {
    body = (await request.json()) as { method?: unknown };
  } catch {
    return json({ error: "Invalid request body." }, 400);
  }
  if (!isMethod(body.method)) return json({ error: "Unsupported support method." }, 400);
  const method = revealSupportMethod(body.method);
  if (!method) return json({ error: "This support method is not configured." }, 404);
  return json(method);
}
