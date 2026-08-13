import { cancelDemoRewardAd } from "@/lib/demo-rate-limit-access";

import { rewardAccount, rewardJson, rewardSessionId } from "../../shared";

export const runtime = "edge";

export async function POST(request: Request) {
  const account = await rewardAccount(request, true);
  if ("response" in account) return account.response;
  const parsed = await rewardSessionId(request, account.requestId);
  if ("response" in parsed) return parsed.response;
  try {
    const result = await cancelDemoRewardAd(account.identifier, parsed.sessionId);
    return rewardJson({ result, requestId: account.requestId }, 200, account.requestId);
  } catch {
    return rewardJson({ error: "Reward service is temporarily unavailable.", requestId: account.requestId }, 503, account.requestId);
  }
}

