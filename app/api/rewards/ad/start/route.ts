import { startDemoRewardAd } from "@/lib/demo-rate-limit-access";
import { rewardedAdSmartlink, rewardedAdsEnabled } from "@/lib/rewarded-ads";

import { rewardAccount, rewardJson } from "../../shared";

export const runtime = "edge";

export async function POST(request: Request) {
  const account = await rewardAccount(request, true);
  if ("response" in account) return account.response;
  const adUrl = rewardedAdsEnabled() ? rewardedAdSmartlink() : "";
  if (!adUrl) return rewardJson({ error: "Rewarded advertising is not configured.", requestId: account.requestId }, 503, account.requestId);
  try {
    const result = await startDemoRewardAd(account.identifier);
    const status = result.allowed ? 200 : result.error === "cooldown" || result.error === "session_active" ? 409 : 429;
    return rewardJson({ result, ...(result.allowed ? { adUrl } : {}), requestId: account.requestId }, status, account.requestId);
  } catch {
    return rewardJson({ error: "Reward service is temporarily unavailable.", requestId: account.requestId }, 503, account.requestId);
  }
}

