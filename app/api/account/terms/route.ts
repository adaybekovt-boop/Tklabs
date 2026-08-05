import { auth } from "@/auth";
import { acceptTerms, getTermsConsentStatus, TermsStorageUnavailableError } from "@/lib/terms-consent";
import { CURRENT_TERMS_VERSION, type TermsLanguage } from "@/lib/terms";
import { parseJsonBody, RequestBodyTooLargeError } from "@/lib/request-body";
import { isTrustedRequestOrigin } from "@/lib/request-security";

export const runtime = "edge";

function noStore(init?: ResponseInit) {
  return { ...init, headers: { "cache-control": "no-store", ...(init?.headers ?? {}) } };
}

function unavailableResponse() {
  return Response.json({ error: "Terms consent storage is unavailable." }, noStore({ status: 503 }));
}

async function getUser() {
  try {
    const session = await auth();
    const sessionUser = session?.user;
    const email = sessionUser?.email?.trim().toLowerCase();
    if (!sessionUser || !email) return { session: null, unavailable: false };
    return {
      unavailable: false,
      session: {
        email,
        name: sessionUser.name,
        image: sessionUser.image,
      },
    };
  } catch (error) {
    console.error("Unable to read authentication session for terms consent", error);
    return { session: null, unavailable: true };
  }
}

export async function GET() {
  const user = await getUser();
  if (user.unavailable) return unavailableResponse();
  if (!user.session) return Response.json({ error: "Authentication required." }, noStore({ status: 401 }));

  try {
    return Response.json(await getTermsConsentStatus(user.session), noStore());
  } catch (error) {
    if (error instanceof TermsStorageUnavailableError) return unavailableResponse();
    console.error("Unable to read terms consent", error);
    return unavailableResponse();
  }
}

export async function POST(request: Request) {
  if (!isTrustedRequestOrigin(request)) return Response.json({ error: "Request origin is not allowed." }, noStore({ status: 403 }));

  const user = await getUser();
  if (user.unavailable) return unavailableResponse();
  if (!user.session) return Response.json({ error: "Authentication required." }, noStore({ status: 401 }));

  let body: { language?: unknown; version?: unknown } | null;
  try {
    body = await parseJsonBody<{ language?: unknown; version?: unknown }>(request, 8 * 1024);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return Response.json({ error: "Request body is too large." }, noStore({ status: 413 }));
    throw error;
  }

  const language = body?.language;
  const version = body?.version;
  if ((language !== "ru" && language !== "en") || version !== CURRENT_TERMS_VERSION) {
    return Response.json({ error: "The agreement version or language is invalid." }, noStore({ status: 400 }));
  }

  try {
    return Response.json(await acceptTerms(user.session, language as TermsLanguage, version), noStore());
  } catch (error) {
    if (error instanceof TermsStorageUnavailableError) return unavailableResponse();
    if (error instanceof Error && error.message === "Terms version is not current.") {
      return Response.json({ error: error.message }, noStore({ status: 409 }));
    }
    console.error("Unable to save terms consent", error);
    return unavailableResponse();
  }
}
