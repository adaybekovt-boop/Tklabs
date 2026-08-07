import { POST as legacyPost } from "@/app/api/clodex/route";
import { neutralizeProviderBranding } from "@/lib/public-branding";

export const runtime = "edge";

export async function POST(request: Request) {
  const response = await legacyPost(request);
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("application/json")) return response;

  const payload = await response.json().catch(() => null) as {
    error?: unknown;
    meta?: { actualProvider?: unknown } & Record<string, unknown>;
    [key: string]: unknown;
  } | null;
  if (!payload) return response;

  if (typeof payload.error === "string") payload.error = neutralizeProviderBranding(payload.error);
  if (payload.meta?.actualProvider === "clodex") payload.meta.actualProvider = "external-api";

  return Response.json(payload, {
    status: response.status,
    headers: response.headers,
  });
}
