import { auth } from "@/auth";
import {
  AccountAccessUnavailableError,
  getClodexAccessStatus,
  redeemClodexAccess,
} from "@/lib/account-access";
import { parseJsonBody, RequestBodyTooLargeError } from "@/lib/request-body";
import { isTrustedRequestOrigin } from "@/lib/request-security";

export const runtime = "edge";

function sessionEmail(session: { user?: { email?: string | null } } | null) {
  return session?.user?.email?.trim().toLowerCase() ?? "";
}

function unavailableResponse() {
  return Response.json(
    { error: "Model access is being configured. Please try again shortly." },
    { status: 503, headers: { "cache-control": "no-store" } },
  );
}

export async function GET() {
  const session = await auth();
  const email = sessionEmail(session);
  if (!email) return Response.json({ error: "Authentication required." }, { status: 401, headers: { "cache-control": "no-store" } });

  try {
    return Response.json(await getClodexAccessStatus(email), { headers: { "cache-control": "no-store" } });
  } catch (error) {
    if (error instanceof AccountAccessUnavailableError) return unavailableResponse();
    console.error("Unable to read Clodex access status", error);
    return unavailableResponse();
  }
}

export async function POST(request: Request) {
  if (!isTrustedRequestOrigin(request)) return Response.json({ error: "Request origin is not allowed." }, { status: 403, headers: { "cache-control": "no-store" } });

  const session = await auth();
  const email = sessionEmail(session);
  if (!email) return Response.json({ error: "Authentication required." }, { status: 401, headers: { "cache-control": "no-store" } });

  let body: { code?: unknown } | null;
  try {
    body = await parseJsonBody<{ code?: unknown }>(request, 8 * 1024);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return Response.json({ error: "Request body is too large." }, { status: 413 });
    throw error;
  }
  const code = typeof body?.code === "string" ? body.code.trim() : "";
  if (!code || code.length > 160) return Response.json({ error: "Enter a valid access code." }, { status: 400, headers: { "cache-control": "no-store" } });

  try {
    const result = await redeemClodexAccess(email, code);
    if (result.redeemed) return Response.json(result, { headers: { "cache-control": "no-store" } });
    if (result.error === "not_configured") return unavailableResponse();
    if (result.error === "too_many_attempts") {
      const retryAfter = result.retryAt ? Math.max(1, Math.ceil((result.retryAt - Date.now()) / 1000)) : undefined;
      return Response.json(
        { ...result, error: "Too many attempts. Try again later." },
        { status: 429, headers: { "cache-control": "no-store", ...(retryAfter ? { "retry-after": String(retryAfter) } : {}) } },
      );
    }
    return Response.json({ ...result, error: "The access code is not valid." }, { status: 400, headers: { "cache-control": "no-store" } });
  } catch (error) {
    if (error instanceof AccountAccessUnavailableError) return unavailableResponse();
    console.error("Unable to redeem Clodex access", error);
    return unavailableResponse();
  }
}
