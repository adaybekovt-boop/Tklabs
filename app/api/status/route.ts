import { env } from "cloudflare:workers";

export const runtime = "edge";

type HealthStatus = "operational" | "degraded" | "down" | "not_configured";

type HealthCheck = {
  id: string;
  status: HealthStatus;
  latencyMs: number | null;
};

const PROVIDER_TIMEOUT_MS = 2_500;

function firstEnv(...names: string[]) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return "";
}

async function probe(url: string, headers: Record<string, string>): Promise<Pick<HealthCheck, "status" | "latencyMs">> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);
  const startedAt = Date.now();

  try {
    const response = await fetch(url, { headers, method: "GET", signal: controller.signal });
    return {
      status: response.ok ? "operational" : response.status < 500 ? "degraded" : "down",
      latencyMs: Date.now() - startedAt,
    };
  } catch {
    return { status: "down", latencyMs: Date.now() - startedAt };
  } finally {
    clearTimeout(timeout);
  }
}

async function providerCheck(
  id: string,
  url: string,
  headers: Record<string, string>,
  configured: boolean,
): Promise<HealthCheck> {
  if (!configured) return { id, status: "not_configured", latencyMs: null };
  return { id, ...(await probe(url, headers)) };
}

export async function GET() {
  const nvidiaKey = firstEnv("NVIDIA_API_KEY_PRIMARY", "NVIDIA_API_KEY_1", "NVIDIA_API_KEY");
  const clodexKey = firstEnv("CLODEX_API_KEY");
  const authConfigured = Boolean(firstEnv("AUTH_SECRET") && firstEnv("AUTH_GOOGLE_ID") && firstEnv("AUTH_GOOGLE_SECRET"));
  const rateLimitConfigured = Boolean((env as unknown as { CLODEX_ACCESS?: unknown }).CLODEX_ACCESS);

  const checks = await Promise.all([
    providerCheck(
      "inference",
      "https://integrate.api.nvidia.com/v1/models",
      nvidiaKey ? { authorization: `Bearer ${nvidiaKey}` } : {},
      Boolean(nvidiaKey),
    ),
    providerCheck(
      "clodex",
      "https://clodex.xyz/v1/models",
      clodexKey ? { "anthropic-version": "2023-06-01", "x-api-key": clodexKey } : {},
      Boolean(clodexKey),
    ),
    Promise.resolve<HealthCheck>({ id: "auth", status: authConfigured ? "operational" : "not_configured", latencyMs: null }),
    Promise.resolve<HealthCheck>({ id: "access", status: rateLimitConfigured ? "operational" : "not_configured", latencyMs: null }),
  ]);

  const checkedAt = new Date().toISOString();
  const allOperational = checks.every((check) => check.status === "operational");

  return Response.json(
    { checkedAt, source: "live", ok: allOperational, services: checks },
    { headers: { "cache-control": "public, max-age=15, s-maxage=30" } },
  );
}
