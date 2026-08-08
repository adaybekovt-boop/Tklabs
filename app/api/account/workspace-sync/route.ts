import { auth } from "@/auth";
import { parseJsonBody, RequestBodyTooLargeError } from "@/lib/request-body";
import { isTrustedRequestOrigin } from "@/lib/request-security";
import { getWorkspaceSnapshot, putWorkspaceSnapshot, WorkspaceSyncConflictError, WorkspaceSyncUnavailableError } from "@/lib/workspace-sync-server";

export const runtime = "edge";

function noStore(init?: ResponseInit) {
  return { ...init, headers: { "cache-control": "no-store", ...(init?.headers ?? {}) } };
}

async function userEmail() {
  try { return (await auth())?.user?.email?.trim().toLowerCase() ?? ""; } catch { return ""; }
}

function unavailable() {
  return Response.json({ available: false, error: "workspace_sync_unavailable" }, noStore({ status: 503 }));
}

export async function GET() {
  const email = await userEmail();
  if (!email) return Response.json({ error: "Authentication required." }, noStore({ status: 401 }));
  try {
    const snapshot = await getWorkspaceSnapshot(email);
    return Response.json({ available: true, snapshot }, noStore());
  } catch (error) {
    if (error instanceof WorkspaceSyncUnavailableError) return unavailable();
    throw error;
  }
}

export async function PUT(request: Request) {
  if (!isTrustedRequestOrigin(request)) return Response.json({ error: "Request origin is not allowed." }, noStore({ status: 403 }));
  const email = await userEmail();
  if (!email) return Response.json({ error: "Authentication required." }, noStore({ status: 401 }));

  let body: { payload?: unknown; expectedRevision?: unknown } | null;
  try {
    body = await parseJsonBody<{ payload?: unknown; expectedRevision?: unknown }>(request, 2 * 1024 * 1024);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return Response.json({ error: "Workspace snapshot is too large." }, noStore({ status: 413 }));
    throw error;
  }

  if (typeof body?.payload !== "string" || Array.from(body.payload).length > 1_800_000) return Response.json({ error: "Workspace snapshot is invalid." }, noStore({ status: 400 }));
  try {
    const parsed = JSON.parse(body.payload);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("invalid");
  } catch {
    return Response.json({ error: "Workspace snapshot is invalid." }, noStore({ status: 400 }));
  }
  const expectedRevision = body.expectedRevision === null || body.expectedRevision === undefined
    ? null
    : Number.isInteger(body.expectedRevision) && Number(body.expectedRevision) >= 0 ? Number(body.expectedRevision) : NaN;
  if (Number.isNaN(expectedRevision)) return Response.json({ error: "Workspace revision is invalid." }, noStore({ status: 400 }));

  try {
    return Response.json({ available: true, snapshot: await putWorkspaceSnapshot(email, body.payload, expectedRevision) }, noStore());
  } catch (error) {
    if (error instanceof WorkspaceSyncConflictError) return Response.json({ error: "workspace_sync_conflict", revision: error.revision }, noStore({ status: 409 }));
    if (error instanceof WorkspaceSyncUnavailableError) return unavailable();
    if (error instanceof Error && error.message === "workspace_sync_payload_too_large") return Response.json({ error: "Workspace snapshot is too large." }, noStore({ status: 413 }));
    throw error;
  }
}
