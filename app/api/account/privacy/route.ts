import { auth } from "@/auth";
import { deleteAccountData, exportAccountData, PrivacyDataUnavailableError } from "@/lib/privacy-server";
import { parseJsonBody, RequestBodyTooLargeError } from "@/lib/request-body";
import { isTrustedRequestOrigin } from "@/lib/request-security";

export const runtime = "edge";
const CONFIRMATION = "DELETE MY TK LAB DATA";

function noStore(init?: ResponseInit) { return { ...init, headers: { "cache-control": "no-store", ...(init?.headers ?? {}) } }; }
async function email() { try { return (await auth())?.user?.email?.trim().toLowerCase() ?? ""; } catch { return ""; } }

export async function GET() {
  const userEmail = await email();
  if (!userEmail) return Response.json({ error: "Authentication required." }, noStore({ status: 401 }));
  try { return Response.json(await exportAccountData(userEmail), noStore()); }
  catch (error) { if (error instanceof PrivacyDataUnavailableError) return Response.json({ error: "privacy_export_unavailable" }, noStore({ status: 503 })); throw error; }
}

export async function DELETE(request: Request) {
  if (!isTrustedRequestOrigin(request)) return Response.json({ error: "Request origin is not allowed." }, noStore({ status: 403 }));
  const userEmail = await email();
  if (!userEmail) return Response.json({ error: "Authentication required." }, noStore({ status: 401 }));
  let body: { confirmation?: unknown } | null;
  try { body = await parseJsonBody<{ confirmation?: unknown }>(request, 2 * 1024); }
  catch (error) { if (error instanceof RequestBodyTooLargeError) return Response.json({ error: "Request body is too large." }, noStore({ status: 413 })); throw error; }
  if (body?.confirmation !== CONFIRMATION) return Response.json({ error: "Explicit deletion confirmation is required." }, noStore({ status: 400 }));
  try { return Response.json(await deleteAccountData(userEmail), noStore()); }
  catch (error) { if (error instanceof PrivacyDataUnavailableError) return Response.json({ error: "privacy_delete_unavailable" }, noStore({ status: 503 })); throw error; }
}
