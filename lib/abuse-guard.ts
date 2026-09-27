import { hmacSha256Hex } from "@/lib/rate-limit-identity";

export type AbuseLimiter = { limit(input: { key: string }): Promise<{ success: boolean }> };
export type AbuseGuardEnvironment = {
  RATE_LIMIT_SECRET?: string;
  WORKSPACE_TRAFFIC_LIMIT?: AbuseLimiter;
  WORKSPACE_WRITE_LIMIT?: AbuseLimiter;
  WORKSPACE_AI_LIMIT?: AbuseLimiter;
  ACCOUNT_AI_LIMIT?: AbuseLimiter;
};

const AI_PATHS = new Set(["/api/demo", "/api/clodex", "/api/tts", "/api/external-api"]);
const EXEMPT_PATHS = new Set(["/api/ready"]);
const RETRY_AFTER_SECONDS = 60;

function isDevelopment() { return process.env.NODE_ENV !== "production"; }

function rejection(status: 429 | 503, reason: "rate_limited" | "unavailable") {
  return Response.json(
    { code: reason, error: status === 429 ? "Too many requests. Try again in a minute." : "Request protection is temporarily unavailable." },
    { status, headers: { "cache-control": "no-store", "content-type": "application/json", "x-content-type-options": "nosniff", ...(status === 429 ? { "retry-after": String(RETRY_AFTER_SECONDS) } : {}) } },
  );
}

function gatedPath(pathname: string) {
  // OAuth redirects and health probes must remain available even if one NAT
  // address is abusive. An edge WAF rule can separately protect login.
  if (pathname.startsWith("/api/auth/callback/") || EXEMPT_PATHS.has(pathname)) return false;
  if (/^\/(?:_next|assets|images|fonts)(?:\/|$)/.test(pathname) || /\.(?:css|js|mjs|png|jpe?g|webp|avif|woff2?|svg|ico|map)$/i.test(pathname)) return false;
  return true;
}

async function check(limiter: AbuseLimiter | undefined, key: string, production: boolean) {
  if (!limiter) return production ? rejection(503, "unavailable") : null;
  try {
    return (await limiter.limit({ key })).success ? null : rejection(429, "rate_limited");
  } catch {
    // Never send a costly request to a model when admission is unavailable.
    return rejection(503, "unavailable");
  }
}

export async function guardWorkerRequest(request: Request, bindings: AbuseGuardEnvironment, production = !isDevelopment()): Promise<Response | null> {
  const pathname = new URL(request.url).pathname;
  if (!gatedPath(pathname)) return null;

  const cloudflareRequest = request as Request & { cf?: unknown };
  const ip = cloudflareRequest.cf ? request.headers.get("cf-connecting-ip")?.trim() : "";
  const secret = bindings.RATE_LIMIT_SECRET?.trim();
  if (!ip || !secret) return production ? rejection(503, "unavailable") : null;
  const key = await hmacSha256Hex(`visitor:${ip}`, secret);

  const traffic = await check(bindings.WORKSPACE_TRAFFIC_LIMIT, `traffic:${key}`, production);
  if (traffic) return traffic;

  if (request.method !== "GET" && request.method !== "HEAD") {
    const write = await check(bindings.WORKSPACE_WRITE_LIMIT, `write:${key}`, production);
    if (write) return write;
  }

  if (request.method === "POST" && AI_PATHS.has(pathname)) {
    return check(bindings.WORKSPACE_AI_LIMIT, `ai:${key}`, production);
  }
  return null;
}

export async function guardAccountAiRequest(email: string, bindings: AbuseGuardEnvironment, production = !isDevelopment()): Promise<Response | null> {
  const secret = bindings.RATE_LIMIT_SECRET?.trim();
  if (!secret || !email.trim()) return production ? rejection(503, "unavailable") : null;
  const key = await hmacSha256Hex(`account:${email.trim().toLowerCase()}`, secret);
  return check(bindings.ACCOUNT_AI_LIMIT, key, production);
}
