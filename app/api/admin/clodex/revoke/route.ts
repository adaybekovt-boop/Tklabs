import { auth } from "@/auth";
import { AccountAccessUnavailableError, revokeClodexAccess } from "@/lib/account-access";
import { isAdminEmail } from "@/lib/privileged-access";
import { newRequestId } from "@/lib/ai/provider-http";
import { parseJsonBody, RequestBodyTooLargeError } from "@/lib/request-body";
import { isTrustedRequestOrigin } from "@/lib/request-security";

export const runtime = "edge";

type RevokeBody = { email?: unknown };
type Session = { user?: { email?: string | null } } | null;
type SessionReader = () => Promise<Session>;

function response(payload: unknown, requestId: string, status = 200) {
  return Response.json(payload, {
    status,
    headers: { "cache-control": "no-store", "x-request-id": requestId },
  });
}

function normalizeTarget(value: unknown) {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (email.length < 3 || email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

export async function handleAdminClodexRevoke(request: Request, readSession: SessionReader) {
  const requestId = newRequestId();
  if (!isTrustedRequestOrigin(request)) return response({ error: "Request origin is not allowed.", requestId }, requestId, 403);

  let session;
  try {
    session = await readSession();
  } catch {
    return response({ error: "Authentication service is temporarily unavailable.", requestId }, requestId, 503);
  }
  const adminEmail = session?.user?.email?.trim().toLowerCase() ?? "";
  if (!adminEmail) return response({ error: "Authentication required.", requestId }, requestId, 401);
  if (!isAdminEmail(adminEmail)) return response({ error: "Administrator access required.", requestId }, requestId, 403);

  let body: RevokeBody | null;
  try {
    body = await parseJsonBody<RevokeBody>(request, 8 * 1024);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return response({ error: "Request body is too large.", requestId }, requestId, 413);
    throw error;
  }
  const targetEmail = normalizeTarget(body?.email);
  if (!targetEmail) return response({ error: "A valid target email is required.", requestId }, requestId, 400);

  try {
    const result = await revokeClodexAccess(targetEmail);
    return response({ revoked: result.revoked, active: result.active, hasGrant: result.hasGrant, requestId }, requestId);
  } catch (error) {
    if (error instanceof AccountAccessUnavailableError) return response({ error: "Model access is being configured.", requestId }, requestId, 503);
    console.error("clodex.admin_revoke_failed", { requestId, reason: error instanceof Error ? error.name : "unknown" });
    return response({ error: "Unable to revoke model access.", requestId }, requestId, 503);
  }
}

export async function POST(request: Request) {
  return handleAdminClodexRevoke(request, auth);
}
