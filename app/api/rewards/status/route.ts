import { getDemoRewardStatus } from "@/lib/demo-rate-limit-access";

import { rewardAccount, rewardJson } from "../shared";

export const runtime = "edge";

export async function GET(request: Request) {
  const account = await rewardAccount(request);
  if ("response" in account) return account.response;
  try {
    const status = await getDemoRewardStatus(account.identifier);
    return rewardJson({ status, requestId: account.requestId }, 200, account.requestId);
  } catch {
    return rewardJson({ error: "Reward service is temporarily unavailable.", requestId: account.requestId }, 503, account.requestId);
  }
}

