import { env } from "cloudflare:workers";

import { DEMO_REQUEST_LIMIT, DEMO_REQUEST_WINDOW_MS, type DemoConsumeResult } from "@/lib/demo-rate-limit";

type DemoRateLimitStub = {
  consumeDemo(): Promise<DemoConsumeResult>;
};

type DemoRateLimitNamespace = {
  getByName(name: string): DemoRateLimitStub;
};

type LocalUsage = {
  count: number;
  windowStart: number;
};

const localUsage = new Map<string, LocalUsage>();

export class DemoRateLimitUnavailableError extends Error {
  constructor() {
    super("The demo rate-limit service is unavailable.");
  }
}

function getNamespace() {
  const namespace = (env as unknown as { CLODEX_ACCESS?: DemoRateLimitNamespace }).CLODEX_ACCESS;
  if (!namespace) throw new DemoRateLimitUnavailableError();
  return namespace;
}

async function rateLimitObjectName(identifier: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(identifier));
  const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return "demo:" + hash;
}

function isDevelopment() {
  return typeof process !== "undefined" && process.env?.NODE_ENV === "development";
}

function consumeLocally(identifier: string): DemoConsumeResult {
  const now = Date.now();
  const current = localUsage.get(identifier);
  const windowStart = current && now - current.windowStart < DEMO_REQUEST_WINDOW_MS ? current.windowStart : now;
  const count = (current && windowStart === current.windowStart ? current.count : 0) + 1;
  localUsage.set(identifier, { count, windowStart });
  const resetAt = windowStart + DEMO_REQUEST_WINDOW_MS;
  return {
    limit: DEMO_REQUEST_LIMIT,
    windowMs: DEMO_REQUEST_WINDOW_MS,
    remaining: Math.max(0, DEMO_REQUEST_LIMIT - count),
    resetAt,
    allowed: count <= DEMO_REQUEST_LIMIT,
  };
}

export async function consumeDemoRequest(identifier: string) {
  if (!identifier.trim()) throw new DemoRateLimitUnavailableError();
  try {
    return await getNamespace().getByName(await rateLimitObjectName(identifier.trim())).consumeDemo();
  } catch (error) {
    // Vinext's local RSC runner may not expose Durable Object bindings. Keep
    // localhost usable without weakening the production binding-backed limit.
    if (!isDevelopment()) throw error;
    return consumeLocally(identifier.trim());
  }
}