import { auth } from "@/auth";
import { newRequestId } from "@/lib/ai/provider-http";
import { getRateLimitIdentity } from "@/lib/rate-limit-identity";
import { parseJsonBody, RequestBodyTooLargeError } from "@/lib/request-body";
import { isTrustedRequestOrigin } from "@/lib/request-security";

const REWARD_BODY_LIMIT_BYTES = 2_048;
const SESSION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function rewardJson(payload: unknown, status = 200, requestId = newRequestId()) {
  return Response.json(payload, { status, headers: { "cache-control": "no-store", "x-request-id": requestId } });
}

export async function rewardAccount(request: Request, requireOrigin = false) {
  const requestId = newRequestId();
  if (requireOrigin && !isTrustedRequestOrigin(request)) return { response: rewardJson({ error: "Request origin is not allowed.", requestId }, 403, requestId) };
  try {
    const email = (await auth())?.user?.email?.trim().toLowerCase() ?? "";
    if (!email) return { response: rewardJson({ error: "Authentication required.", requestId }, 401, requestId) };
    const identity = await getRateLimitIdentity(request, email);
    return { identifier: identity.identifier, requestId };
  } catch {
    return { response: rewardJson({ error: "Reward service is temporarily unavailable.", requestId }, 503, requestId) };
  }
}

export async function rewardSessionId(request: Request, requestId: string) {
  try {
    const body = await parseJsonBody<{ sessionId?: unknown }>(request, REWARD_BODY_LIMIT_BYTES);
    const sessionId = typeof body?.sessionId === "string" ? body.sessionId.trim() : "";
    if (!SESSION_ID_PATTERN.test(sessionId)) return { response: rewardJson({ error: "Invalid reward session.", requestId }, 400, requestId) };
    return { sessionId };
  } catch (error) {
    const status = error instanceof RequestBodyTooLargeError ? 413 : 400;
    return { response: rewardJson({ error: "Invalid reward request.", requestId }, status, requestId) };
  }
}

