import {
  DemoRateLimitUnavailableError,
  commitDemoRequest,
  getDemoRewardStatus,
  releaseDemoRequest,
  reserveDemoRequest,
} from "@/lib/demo-rate-limit-access";
import { getRateLimitIdentity, getRateLimitSecret, hmacSha256Hex, RateLimitConfigurationError } from "@/lib/rate-limit-identity";
import { REWARD_AD_DAILY_LIMIT, REWARD_ADS_PER_REQUEST, rewardedAdsEnabled } from "@/lib/rewarded-ads";

import type { Language } from "./contracts";
import { jsonResponse } from "./http";

type QuotaSettlement = "pending" | "committed" | "released";
type DemoAllowance = Awaited<ReturnType<typeof reserveDemoRequest>>;

export type DemoQuota = {
  cookie: string | null;
  fairnessKey: string;
  commit(): Promise<void>;
  release(): Promise<void>;
};

function noOpQuota(requestId: string): DemoQuota {
  return {
    cookie: null,
    fairnessKey: `privileged:${requestId}`,
    async commit() {},
    async release() {},
  };
}

function unavailableResponse(language: Language, requestId: string, cookie: string | null) {
  return jsonResponse(
    {
      error: language === "ru"
        ? "Демо временно недоступно. Попробуйте позже."
        : "The demo is temporarily unavailable. Please try again later.",
      requestId,
    },
    requestId,
    503,
    cookie,
  );
}

export async function createDemoQuota(input: {
  request: Request;
  requestId: string;
  language: Language;
  sessionEmail: string;
  privileged: boolean;
}): Promise<{ quota: DemoQuota } | { response: Response }> {
  if (input.privileged) return { quota: noOpQuota(input.requestId) };

  let cookie: string | null = null;
  let identifier = "";
  let reservationId = "";
  let fairnessKey = "";
  let allowance: DemoAllowance;

  try {
    const identity = await getRateLimitIdentity(input.request, input.sessionEmail);
    cookie = identity.setCookie;
    identifier = identity.identifier;
    fairnessKey = await hmacSha256Hex(identifier, getRateLimitSecret());
    allowance = await reserveDemoRequest(identity.identifier);
  } catch (error) {
    if (!(error instanceof DemoRateLimitUnavailableError || error instanceof RateLimitConfigurationError)) {
      console.warn("demo.rate_limit_unavailable", { requestId: input.requestId });
    }
    return { response: unavailableResponse(input.language, input.requestId, cookie) };
  }

  if (!allowance.allowed) {
    let rewardOffer: { available: boolean; adsPerRequest?: number; dailyAdLimit?: number; adsRemaining?: number } = { available: false };
    if (input.sessionEmail && rewardedAdsEnabled()) {
      try {
        const rewardStatus = await getDemoRewardStatus(identifier);
        if (rewardStatus.enabled && rewardStatus.adsRemaining > 0) {
          rewardOffer = {
            available: true,
            adsPerRequest: REWARD_ADS_PER_REQUEST,
            dailyAdLimit: REWARD_AD_DAILY_LIMIT,
            adsRemaining: rewardStatus.adsRemaining,
          };
        }
      } catch {
        // The ordinary reset path remains available if the reward service is unavailable.
      }
    }
    const retryAfter = allowance.resetAt
      ? Math.max(1, Math.ceil((allowance.resetAt - Date.now()) / 1000))
      : undefined;
    const response = jsonResponse(
      {
        error: input.language === "ru"
          ? rewardOffer.available
            ? "Дневной лимит Erma исчерпан. Посмотрите две рекламы, чтобы получить ещё один запрос."
            : "Дневной лимит Erma исчерпан. Попробуйте после сброса лимита."
          : rewardOffer.available
            ? "Your daily Erma limit is reached. Watch two ads to unlock one more request."
            : "Your daily Erma limit is reached. Try again after the limit resets.",
        code: "demo_quota_exhausted",
        retryAt: allowance.resetAt,
        rewards: rewardOffer,
        requestId: input.requestId,
      },
      input.requestId,
      429,
      cookie,
    );
    if (retryAfter) response.headers.set("retry-after", String(retryAfter));
    return { response };
  }

  reservationId = allowance.reservationId ?? "";
  if (!reservationId || !fairnessKey) return { response: unavailableResponse(input.language, input.requestId, cookie) };

  let settlement: QuotaSettlement = "pending";
  return {
    quota: {
      cookie,
      fairnessKey,
      async commit() {
        if (settlement !== "pending") return;
        settlement = "committed";
        try {
          await commitDemoRequest(identifier, reservationId);
        } catch {
          console.warn("demo.rate_limit_commit_failed", { requestId: input.requestId });
        }
      },
      async release() {
        if (settlement !== "pending") return;
        settlement = "released";
        try {
          await releaseDemoRequest(identifier, reservationId);
        } catch {
          console.warn("demo.rate_limit_release_failed", { requestId: input.requestId });
        }
      },
    },
  };
}
