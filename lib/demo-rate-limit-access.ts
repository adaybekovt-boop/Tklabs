import { env } from "cloudflare:workers";

import { DEMO_REQUEST_LIMIT, DEMO_REQUEST_WINDOW_MS, type DemoReleaseResult, type DemoReservationResult } from "@/lib/demo-rate-limit";
import { getRateLimitSecret, hmacSha256Hex } from "@/lib/rate-limit-identity";
import {
  REWARD_AD_COOLDOWN_MS,
  REWARD_AD_DAILY_LIMIT,
  REWARD_AD_MIN_VIEW_MS,
  REWARD_AD_SESSION_ATTEMPT_LIMIT,
  REWARD_AD_SESSION_TTL_MS,
  REWARD_ADS_PER_REQUEST,
  REWARD_BONUS_REQUEST_LIMIT,
  rewardedAdsEnabled,
  type RewardAdCancelResult,
  type RewardAdCompleteResult,
  type RewardAdStartResult,
  type RewardAdStatus,
} from "@/lib/rewarded-ads";

type DemoRateLimitStub = {
  reserveDemo(): Promise<DemoReservationResult>;
  commitDemo(reservationId: string): Promise<DemoReservationResult>;
  releaseDemo(reservationId: string): Promise<DemoReleaseResult>;
  getRewardAdStatus(): Promise<RewardAdStatus>;
  startRewardAd(): Promise<RewardAdStartResult>;
  completeRewardAd(sessionId: string): Promise<RewardAdCompleteResult>;
  cancelRewardAd(sessionId: string): Promise<RewardAdCancelResult>;
};

type DemoRateLimitNamespace = {
  getByName(name: string): DemoRateLimitStub;
};

type LocalUsage = {
  count: number;
  windowStart: number;
  reservations: Map<string, { state: "reserved" | "committed" | "released"; source: "base" | "reward" }>;
  reward: {
    adsCompleted: number;
    bonusBalance: number;
    lastCompletedAt: number | null;
    sessions: Map<string, {
      state: "active" | "completed" | "cancelled" | "expired";
      startedAt: number;
      eligibleAt: number;
      expiresAt: number;
      credited: boolean;
    }>;
  };
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

function newLocalUsage(now = Date.now()): LocalUsage {
  return {
    count: 0,
    windowStart: now,
    reservations: new Map(),
    reward: { adsCompleted: 0, bonusBalance: 0, lastCompletedAt: null, sessions: new Map() },
  };
}

function localState(identifier: string, now = Date.now()) {
  const current = localUsage.get(identifier);
  if (current && now - current.windowStart < DEMO_REQUEST_WINDOW_MS) return current;
  const fresh = newLocalUsage(now);
  localUsage.set(identifier, fresh);
  return fresh;
}

function statusFor(usage: LocalUsage): DemoReservationResult {
  const resetAt = usage.windowStart + DEMO_REQUEST_WINDOW_MS;
  const baseRemaining = Math.max(0, DEMO_REQUEST_LIMIT - usage.count);
  return {
    limit: DEMO_REQUEST_LIMIT,
    windowMs: DEMO_REQUEST_WINDOW_MS,
    remaining: baseRemaining + usage.reward.bonusBalance,
    baseRemaining,
    bonusRemaining: usage.reward.bonusBalance,
    resetAt,
    allowed: true,
  };
}

function reserveLocally(identifier: string): DemoReservationResult {
  const now = Date.now();
  const usage = localState(identifier, now);
  let source: "base" | "reward";
  if (usage.count < DEMO_REQUEST_LIMIT) {
    source = "base";
    usage.count += 1;
  } else if (usage.reward.bonusBalance > 0) {
    source = "reward";
    usage.reward.bonusBalance -= 1;
  } else {
    return { ...statusFor(usage), allowed: false };
  }
  const reservationId = crypto.randomUUID();
  usage.reservations.set(reservationId, { state: "reserved", source });
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
  const reservation = usage.reservations.get(reservationId);
  if (reservation?.state === "reserved") reservation.state = "committed";
  return { ...statusFor(usage), reservationId };
}

function releaseLocally(identifier: string, reservationId: string): DemoReleaseResult {
  const usage = currentLocalUsage(identifier);
  if (!usage) return { limit: DEMO_REQUEST_LIMIT, windowMs: DEMO_REQUEST_WINDOW_MS, remaining: DEMO_REQUEST_LIMIT, resetAt: null, released: false, reservationId };
  const reservation = usage.reservations.get(reservationId);
  if (reservation?.state !== "reserved") return { ...statusFor(usage), released: false, reservationId };
  reservation.state = "released";
  if (reservation.source === "reward") usage.reward.bonusBalance = Math.min(REWARD_BONUS_REQUEST_LIMIT, usage.reward.bonusBalance + 1);
  else usage.count = Math.max(0, usage.count - 1);
  return { ...statusFor(usage), released: true, reservationId };
}

function cleanupLocalRewardSessions(usage: LocalUsage, now: number) {
  for (const session of usage.reward.sessions.values()) {
    if (session.state === "active" && session.expiresAt <= now) session.state = "expired";
  }
}

function rewardStatusLocally(identifier: string, now = Date.now()): RewardAdStatus {
  const usage = localState(identifier, now);
  cleanupLocalRewardSessions(usage, now);
  const baseRemaining = Math.max(0, DEMO_REQUEST_LIMIT - usage.count);
  const nextAdAt = usage.reward.lastCompletedAt === null ? null : usage.reward.lastCompletedAt + REWARD_AD_COOLDOWN_MS;
  const enabled = rewardedAdsEnabled();
  return {
    enabled,
    adsPerRequest: REWARD_ADS_PER_REQUEST,
    dailyAdLimit: REWARD_AD_DAILY_LIMIT,
    adsCompleted: usage.reward.adsCompleted,
    adsTowardNextRequest: usage.reward.adsCompleted % REWARD_ADS_PER_REQUEST,
    adsRemaining: Math.max(0, REWARD_AD_DAILY_LIMIT - usage.reward.adsCompleted),
    bonusRequests: usage.reward.bonusBalance,
    bonusRequestLimit: REWARD_BONUS_REQUEST_LIMIT,
    resetAt: usage.windowStart + DEMO_REQUEST_WINDOW_MS,
    nextAdAt,
    canStart: enabled && baseRemaining === 0 && usage.reward.bonusBalance === 0 && usage.reward.adsCompleted < REWARD_AD_DAILY_LIMIT && (nextAdAt === null || nextAdAt <= now),
  };
}

function startRewardLocally(identifier: string): RewardAdStartResult {
  const now = Date.now();
  const usage = localState(identifier, now);
  const status = rewardStatusLocally(identifier, now);
  if (!status.enabled) return { ...status, allowed: false, error: "disabled" };
  if (Math.max(0, DEMO_REQUEST_LIMIT - usage.count) > 0) return { ...status, allowed: false, error: "quota_available" };
  if (usage.reward.bonusBalance > 0) return { ...status, allowed: false, error: "bonus_available" };
  if (usage.reward.adsCompleted >= REWARD_AD_DAILY_LIMIT) return { ...status, allowed: false, error: "daily_limit" };
  if (status.nextAdAt && status.nextAdAt > now) return { ...status, allowed: false, error: "cooldown" };
  const active = [...usage.reward.sessions.entries()].find(([, session]) => session.state === "active");
  if (!active && usage.reward.sessions.size >= REWARD_AD_SESSION_ATTEMPT_LIMIT) return { ...status, allowed: false, error: "too_many_attempts" };
  const sessionId = active?.[0] ?? crypto.randomUUID();
  const session = { state: "active" as const, startedAt: now, eligibleAt: now + REWARD_AD_MIN_VIEW_MS, expiresAt: now + REWARD_AD_SESSION_TTL_MS, credited: false };
  usage.reward.sessions.set(sessionId, session);
  return { ...rewardStatusLocally(identifier, now), allowed: true, sessionId, ...session };
}

function completeRewardLocally(identifier: string, sessionId: string): RewardAdCompleteResult {
  const now = Date.now();
  const usage = localState(identifier, now);
  cleanupLocalRewardSessions(usage, now);
  const session = usage.reward.sessions.get(sessionId);
  if (!session) return { ...rewardStatusLocally(identifier, now), completed: false, credited: false, sessionId, error: "session_missing" };
  if (session.state === "completed") return { ...rewardStatusLocally(identifier, now), completed: true, credited: session.credited, sessionId };
  if (session.state === "expired" || session.expiresAt <= now) return { ...rewardStatusLocally(identifier, now), completed: false, credited: false, sessionId, error: "session_expired" };
  if (session.state !== "active") return { ...rewardStatusLocally(identifier, now), completed: false, credited: false, sessionId, error: "session_missing" };
  if (session.eligibleAt > now) return { ...rewardStatusLocally(identifier, now), completed: false, credited: false, sessionId, error: "too_early" };
  const adsCompleted = Math.min(REWARD_AD_DAILY_LIMIT, usage.reward.adsCompleted + 1);
  const credited = adsCompleted % REWARD_ADS_PER_REQUEST === 0;
  session.state = "completed";
  session.credited = credited;
  usage.reward.adsCompleted = adsCompleted;
  usage.reward.lastCompletedAt = now;
  if (credited) usage.reward.bonusBalance = Math.min(REWARD_BONUS_REQUEST_LIMIT, usage.reward.bonusBalance + 1);
  return { ...rewardStatusLocally(identifier, now), completed: true, credited, sessionId };
}

function cancelRewardLocally(identifier: string, sessionId: string): RewardAdCancelResult {
  const now = Date.now();
  const usage = localState(identifier, now);
  const session = usage.reward.sessions.get(sessionId);
  const cancelled = session?.state === "active";
  if (cancelled && session) session.state = "cancelled";
  return { ...rewardStatusLocally(identifier, now), cancelled, sessionId };
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

async function rewardStub(identifier: string) {
  const bucket = await rateLimitObjectName(identifier.trim());
  return { bucket, stub: getNamespace().getByName(bucket) };
}

export async function getDemoRewardStatus(identifier: string) {
  if (!identifier.trim()) throw new DemoRateLimitUnavailableError();
  try {
    return (await rewardStub(identifier)).stub.getRewardAdStatus();
  } catch (error) {
    if (!isDevelopment()) throw error;
    return rewardStatusLocally(await rateLimitObjectName(identifier.trim()));
  }
}

export async function startDemoRewardAd(identifier: string) {
  if (!identifier.trim()) throw new DemoRateLimitUnavailableError();
  try {
    return (await rewardStub(identifier)).stub.startRewardAd();
  } catch (error) {
    if (!isDevelopment()) throw error;
    return startRewardLocally(await rateLimitObjectName(identifier.trim()));
  }
}

export async function completeDemoRewardAd(identifier: string, sessionId: string) {
  if (!identifier.trim() || !sessionId.trim()) throw new DemoRateLimitUnavailableError();
  try {
    return (await rewardStub(identifier)).stub.completeRewardAd(sessionId);
  } catch (error) {
    if (!isDevelopment()) throw error;
    return completeRewardLocally(await rateLimitObjectName(identifier.trim()), sessionId);
  }
}

export async function cancelDemoRewardAd(identifier: string, sessionId: string) {
  if (!identifier.trim() || !sessionId.trim()) throw new DemoRateLimitUnavailableError();
  try {
    return (await rewardStub(identifier)).stub.cancelRewardAd(sessionId);
  } catch (error) {
    if (!isDevelopment()) throw error;
    return cancelRewardLocally(await rateLimitObjectName(identifier.trim()), sessionId);
  }
}

/** Compatibility alias for callers that still use the old name. */
export const consumeDemoRequest = reserveDemoRequest;
