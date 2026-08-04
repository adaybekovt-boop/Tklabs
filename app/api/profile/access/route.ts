import { auth } from "@/auth";
import {
  AccountAccessUnavailableError,
  getClodexAccessStatus,
  redeemClodexAccess,
} from "@/lib/account-access";

export const runtime = "edge";

function sessionEmail(session: { user?: { email?: string | null } } | null) {
  return session?.user?.email?.trim().toLowerCase() ?? "";
}

function unavailableResponse() {
  return Response.json(
    { error: "Model access is being configured. Please try again shortly." },
    { status: 503 },
  );
}

export async function GET() {
  const session = await auth();
  const email = sessionEmail(session);
  if (!email) return Response.json({ error: "Authentication required." }, { status: 401 });

  try {
    return Response.json(await getClodexAccessStatus(email), { headers: { "cache-control": "no-store" } });
  } catch (error) {
    if (error instanceof AccountAccessUnavailableError) return unavailableResponse();
    console.error("Unable to read Clodex access status", error);
    return unavailableResponse();
  }
}

export async function POST(request: Request) {
  const session = await auth();
  const email = sessionEmail(session);
  if (!email) return Response.json({ error: "Authentication required." }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { code?: unknown } | null;
  const code = typeof body?.code === "string" ? body.code.trim() : "";
  if (!code || code.length > 160) return Response.json({ error: "Enter a valid access code." }, { status: 400 });

  try {
    const result = await redeemClodexAccess(email, code);
    if (result.redeemed) return Response.json(result, { headers: { "cache-control": "no-store" } });
    if (result.error === "not_configured") return unavailableResponse();
    if (result.error === "too_many_attempts") {
      return Response.json({ ...result, error: "Too many attempts. Try again later." }, { status: 429 });
    }
    return Response.json({ ...result, error: "The access code is not valid." }, { status: 400 });
  } catch (error) {
    if (error instanceof AccountAccessUnavailableError) return unavailableResponse();
    console.error("Unable to redeem Clodex access", error);
    return unavailableResponse();
  }
}
