export const RATE_LIMIT_COOKIE_NAME = "__Host-tklab-rl";

export class RateLimitConfigurationError extends Error {
  constructor() {
    super("RATE_LIMIT_SECRET is not configured.");
    this.name = "RateLimitConfigurationError";
  }
}

export function getRateLimitSecret() {
  const secret = process.env.RATE_LIMIT_SECRET?.trim();
  if (!secret) throw new RateLimitConfigurationError();
  return secret;
}

export async function hmacSha256Hex(value: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

function cookieValue(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  for (const part of cookieHeader.split(";")) {
    const [name, ...valueParts] = part.trim().split("=");
    if (name === RATE_LIMIT_COOKIE_NAME) return valueParts.join("=");
  }
  return "";
}

function newCookieId() {
  return crypto.randomUUID().replaceAll("-", "");
}

export async function getRateLimitIdentity(request: Request, sessionEmail?: string | null) {
  const secret = getRateLimitSecret();
  const cloudflareRequest = request as Request & { cf?: unknown };
  const connectingIp = request.headers.get("cf-connecting-ip")?.trim();

  // CF-Connecting-IP is trusted only on a request that carries Cloudflare's
  // request metadata. X-Forwarded-For is intentionally never consulted.
  if (connectingIp && cloudflareRequest.cf !== undefined) {
    return { identifier: `ip:${connectingIp}`, setCookie: null as string | null };
  }

  const signedCookie = cookieValue(request);
  const [cookieId, signature] = signedCookie.split(".");
  if (/^[A-Za-z0-9]{24,96}$/.test(cookieId ?? "") && /^[a-f0-9]{64}$/i.test(signature ?? "")) {
    const expected = await hmacSha256Hex(`cookie:${cookieId}`, secret);
    if (constantTimeEqual(expected, signature.toLowerCase())) {
      return { identifier: `cookie:${cookieId}`, setCookie: null as string | null };
    }
  }

  const normalizedEmail = sessionEmail?.trim().toLowerCase();
  const identifier = normalizedEmail ? `account:${normalizedEmail}` : `cookie:${newCookieId()}`;
  if (normalizedEmail) return { identifier, setCookie: null as string | null };

  const id = identifier.slice("cookie:".length);
  const signatureValue = await hmacSha256Hex(identifier, secret);
  const setCookie = `${RATE_LIMIT_COOKIE_NAME}=${id}.${signatureValue}; Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax; Secure`;
  return { identifier, setCookie };
}
