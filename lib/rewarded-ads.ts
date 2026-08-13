import { DEMO_REQUEST_WINDOW_MS } from "@/lib/demo-rate-limit";

export const REWARD_ADS_PER_REQUEST = 2;
export const REWARD_AD_DAILY_LIMIT = 6;
export const REWARD_BONUS_REQUEST_LIMIT = REWARD_AD_DAILY_LIMIT / REWARD_ADS_PER_REQUEST;
export const REWARD_AD_MIN_VIEW_MS = 20_000;
export const REWARD_AD_SESSION_TTL_MS = 10 * 60 * 1000;
export const REWARD_AD_COOLDOWN_MS = 3_000;
/**
 * Cancelling a session and starting a new one never reuses storage (only a
 * still-active session is reused), so a start/cancel loop is otherwise
 * unbounded by the daily ad limit or the cooldown. This caps how many
 * `reward_ad_sessions` rows one account can create per rolling window.
 */
export const REWARD_AD_SESSION_ATTEMPT_LIMIT = REWARD_AD_DAILY_LIMIT * 5;

const ALLOWED_SMARTLINK_HOSTS = new Set(["www.effectivecpmnetwork.com"]);

export type RewardAdError =
  | "disabled"
  | "quota_available"
  | "bonus_available"
  | "daily_limit"
  | "cooldown"
  | "session_active"
  | "session_missing"
  | "session_expired"
  | "too_early"
  | "too_many_attempts";

export type RewardAdStatus = {
  enabled: boolean;
  adsPerRequest: number;
  dailyAdLimit: number;
  adsCompleted: number;
  adsTowardNextRequest: number;
  adsRemaining: number;
  bonusRequests: number;
  bonusRequestLimit: number;
  resetAt: number;
  nextAdAt: number | null;
  canStart: boolean;
};

export type RewardAdStartResult = RewardAdStatus & {
  allowed: boolean;
  sessionId?: string;
  startedAt?: number;
  eligibleAt?: number;
  expiresAt?: number;
  error?: RewardAdError;
};

export type RewardAdCompleteResult = RewardAdStatus & {
  completed: boolean;
  credited: boolean;
  sessionId: string;
  error?: RewardAdError;
};

export type RewardAdCancelResult = RewardAdStatus & {
  cancelled: boolean;
  sessionId: string;
};

export type RewardAdEnvironment = Record<string, string | undefined>;

export function rewardedAdsEnabled(environment: RewardAdEnvironment = process.env) {
  return environment.REWARDED_ADS_ENABLED?.trim().toLowerCase() === "true";
}

export function rewardedAdSmartlink(environment: RewardAdEnvironment = process.env) {
  const configured = environment.REWARDED_AD_SMARTLINK_URL?.trim() || "";
  try {
    const url = new URL(configured);
    return url.protocol === "https:" && ALLOWED_SMARTLINK_HOSTS.has(url.hostname.toLowerCase())
      ? url.toString()
      : "";
  } catch {
    return "";
  }
}

export function rewardWindowResetAt(windowStart: number) {
  return windowStart + DEMO_REQUEST_WINDOW_MS;
}

