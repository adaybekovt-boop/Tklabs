import { env } from "cloudflare:workers";

import { DEMO_REQUEST_LIMIT, DEMO_REQUEST_WINDOW_MS, type DemoReleaseResult, type DemoReservationResult } from "@/lib/demo-rate-limit";
import { getRateLimitSecret, hmacSha256Hex } from "@/lib/rate-limit-identity";

type DemoRateLimitStub = {
  reserveDemo(): Promise<DemoReservationResult>;
  commitDemo(reservationId: string): Promise<DemoReservationResult>;
  releaseDemo(reservationId: string): Promise<DemoReleaseResult>;
};

type DemoRateLimitNamespace = {
  getByName(name: string): DemoRateLimitStub;
};

type LocalUsage = {
  count: number;
  windowStart: number;
  reservations: Map<string, "reserved" | "committed" | "released">;
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

export async function rateLimitObjectName(identifier: string) {
  return "demo:" + await hmacSha256Hex(identifier, getRateLimitSecret());
}

function isDevelopment() {
  return typeof process !== "undefined" && process.env?.NODE_ENV === "development";
}

function statusFor(usage: LocalUsage): DemoReservationResult {
  const resetAt = usage.windowStart + DEMO_REQUEST_WINDOW_MS;
  return {
    limit: DEMO_REQUEST_LIMIT,
    windowMs: DEMO_REQUEST_WINDOW_MS,
    remaining: Math.max(0, DEMO_REQUEST_LIMIT - usage.count),
    resetAt,
    allowed: true,
  };
}

function reserveLocally(identifier: string): DemoReservationResult {
  const now = Date.now();
  const current = localUsage.get(identifier);
  const windowStart = current && now - current.windowStart < DEMO_REQUEST_WINDOW_MS ? current.windowStart : now;
  const usage = current && windowStart === current.windowStart ? current : { count: 0, windowStart, reservations: new Map() };
  if (usage.count >= DEMO_REQUEST_LIMIT) {
    return { ...statusFor(usage), allowed: false };
  }
  usage.count += 1;
  const reservationId = crypto.randomUUID();
  usage.reservations.set(reservationId, "reserved");
  localUsage.set(identifier, usage);
  return { ...statusFor(usage), reservationId };
}

function currentLocalUsage(identifier: string) {
  const usage = localUsage.get(identifier);
  if (!usage || Date.now() - usage.windowStart >= DEMO_REQUEST_WINDOW_MS) return null;
  return usage;
}

function commitLocally(identifier: string, reservationId: string): DemoReservationResult {
  const usage = currentLocalUsage(identifier);
  if (!usage) return { limit: DEMO_REQUEST_LIMIT, windowMs: DEMO_REQUEST_WINDOW_MS, remaining: DEMO_REQUEST_LIMIT, resetAt: null, allowed: false };
  if (usage.reservations.get(reservationId) === "reserved") usage.reservations.set(reservationId, "committed");
  return { ...statusFor(usage), reservationId };
}

function releaseLocally(identifier: string, reservationId: string): DemoReleaseResult {
  const usage = currentLocalUsage(identifier);
  if (!usage) return { limit: DEMO_REQUEST_LIMIT, windowMs: DEMO_REQUEST_WINDOW_MS, remaining: DEMO_REQUEST_LIMIT, resetAt: null, released: false, reservationId };
  const state = usage.reservations.get(reservationId);
  if (state !== "reserved") return { ...statusFor(usage), released: false, reservationId };
  usage.reservations.set(reservationId, "released");
  usage.count = Math.max(0, usage.count - 1);
  return { ...statusFor(usage), released: true, reservationId };
}

export async function reserveDemoRequest(identifier: string) {
  if (!identifier.trim()) throw new DemoRateLimitUnavailableError();
  try {
    const bucket = await rateLimitObjectName(identifier.trim());
    return await getNamespace().getByName(bucket).reserveDemo();
  } catch (error) {
    // Vinext's local RSC runner may not expose Durable Object bindings. Keep
    // localhost usable without weakening the production binding-backed limit.
    if (!isDevelopment()) throw error;
    return reserveLocally(await rateLimitObjectName(identifier.trim()));
  }
}

export async function commitDemoRequest(identifier: string, reservationId: string) {
  const bucket = await rateLimitObjectName(identifier.trim());
  try {
    return await getNamespace().getByName(bucket).commitDemo(reservationId);
  } catch (error) {
    if (!isDevelopment()) throw error;
    return commitLocally(bucket, reservationId);
  }
}

export async function releaseDemoRequest(identifier: string, reservationId: string) {
  const bucket = await rateLimitObjectName(identifier.trim());
  try {
    return await getNamespace().getByName(bucket).releaseDemo(reservationId);
  } catch (error) {
    if (!isDevelopment()) throw error;
    return releaseLocally(bucket, reservationId);
  }
}

/** Compatibility alias for callers that still use the old name. */
export const consumeDemoRequest = reserveDemoRequest;
