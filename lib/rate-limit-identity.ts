export const RATE_LIMIT_COOKIE_NAME = "__Host-tklab-rl";

const LOAD_TEST_ID_HEADER = "x-tklabs-load-test-id";
const LOAD_TEST_SIGNATURE_HEADER = "x-tklabs-load-test-signature";
const PRODUCTION_HOSTS = new Set(["tklabs.uk", "www.tklabs.uk"]);

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

async function signedLoadTestIdentity(request: Request) {
  if (process.env.ERMA_LOAD_TEST_ENABLED?.trim().toLowerCase() !== "true") return null;
  const secret = process.env.ERMA_LOAD_TEST_SECRET?.trim();
  if (!secret) return null;

  let hostname = "";
  try {
    hostname = new URL(request.url).hostname.toLowerCase();
  } catch {
    return null;
  }
  if (PRODUCTION_HOSTS.has(hostname)) return null;

  const identity = request.headers.get(LOAD_TEST_ID_HEADER)?.trim() ?? "";
  const signature = request.headers.get(LOAD_TEST_SIGNATURE_HEADER)?.trim().toLowerCase() ?? "";
  if (!/^[A-Za-z0-9:_-]{1,96}$/.test(identity) || !/^[a-f0-9]{64}$/.test(signature)) return null;

  const expected = await hmacSha256Hex(`load-test:${identity}`, secret);
  return constantTimeEqual(expected, signature) ? `load-test:${identity}` : null;
}

export async function getRateLimitIdentity(request: Request, sessionEmail?: string | null) {
  const secret = getRateLimitSecret();
  const normalizedEmail = sessionEmail?.trim().toLowerCase();
  if (normalizedEmail) return { identifier: `account:${normalizedEmail}`, setCookie: null as string | null };

  const loadTestIdentity = await signedLoadTestIdentity(request);
  if (loadTestIdentity) return { identifier: loadTestIdentity, setCookie: null as string | null };

  const cloudflareRequest = request as Request & { cf?: unknown };
  const connectingIp = request.headers.get("cf-connecting-ip")?.trim();

  // Signed-in users are isolated by account. Anonymous traffic uses the real
  // Cloudflare client IP when available; X-Forwarded-For is never trusted.
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

  const identifier = `cookie:${newCookieId()}`;
  const id = identifier.slice("cookie:".length);
  const signatureValue = await hmacSha256Hex(identifier, secret);
  const setCookie = `${RATE_LIMIT_COOKIE_NAME}=${id}.${signatureValue}; Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax; Secure`;
  return { identifier, setCookie };
}
