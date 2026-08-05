import { auth } from "@/auth";
import { AccountAccessUnavailableError, revokeClodexAccess } from "@/lib/account-access";
import { isClodexEnabled } from "@/lib/feature-flags";
import { isTrustedRequestOrigin } from "@/lib/request-security";

export const runtime = "edge";

export async function POST(request: Request) {
  if (!isClodexEnabled()) return Response.json({ error: "Clodex access is disabled." }, { status: 404, headers: { "cache-control": "no-store" } });
  if (!isTrustedRequestOrigin(request)) return Response.json({ error: "Request origin is not allowed." }, { status: 403, headers: { "cache-control": "no-store" } });

  let session;
  try {
    session = await auth();
  } catch {
    return Response.json({ error: "Authentication service is temporarily unavailable." }, { status: 503, headers: { "cache-control": "no-store" } });
  }
  const email = session?.user?.email?.trim().toLowerCase() ?? "";
  if (!email) return Response.json({ error: "Authentication required." }, { status: 401, headers: { "cache-control": "no-store" } });

  try {
    return Response.json(await revokeClodexAccess(email), { headers: { "cache-control": "no-store" } });
  } catch (error) {
    if (error instanceof AccountAccessUnavailableError) return Response.json({ error: "Model access is being configured." }, { status: 503, headers: { "cache-control": "no-store" } });
    console.error("clodex.revoke_failed", { reason: error instanceof Error ? error.name : "unknown" });
    return Response.json({ error: "Unable to revoke model access." }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}
