import { completeDemoRewardAd } from "@/lib/demo-rate-limit-access";

import { rewardAccount, rewardJson, rewardSessionId } from "../../shared";

export const runtime = "edge";

export async function POST(request: Request) {
  const account = await rewardAccount(request, true);
  if ("response" in account) return account.response;
  const parsed = await rewardSessionId(request, account.requestId);
  if ("response" in parsed) return parsed.response;
  try {
    const result = await completeDemoRewardAd(account.identifier, parsed.sessionId);
    const status = result.completed ? 200 : result.error === "too_early" ? 409 : 400;
    return rewardJson({ result, requestId: account.requestId }, status, account.requestId);
  } catch {
    return rewardJson({ error: "Reward service is temporarily unavailable.", requestId: account.requestId }, 503, account.requestId);
  }
}

