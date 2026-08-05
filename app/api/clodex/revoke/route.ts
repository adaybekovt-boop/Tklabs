export const runtime = "edge";

/** Self-revocation was removed. Keep the old URL inert so stale clients cannot
 * turn it into an account-targeting admin endpoint by accident. */
export async function POST() {
  return Response.json({ error: "This endpoint has been retired." }, { status: 410, headers: { "cache-control": "no-store" } });
}
