import { env } from "cloudflare:workers";

import { getAuthConfigurationIssues } from "@/lib/auth-config";
import { CURRENT_RELEASE_VERSION } from "@/lib/release-version";

export const runtime = "edge";

type RuntimeBindings = {
  DB?: unknown;
  CLODEX_ACCESS?: unknown;
  HEALTH_STATUS?: unknown;
  INFERENCE_SCHEDULER?: unknown;
};

export async function GET() {
  const bindings = env as unknown as RuntimeBindings;
  const checks = {
    database: Boolean(bindings.DB),
    accessStore: Boolean(bindings.CLODEX_ACCESS),
    healthStatus: Boolean(bindings.HEALTH_STATUS),
    inferenceScheduler: process.env.ERMA_PROVIDER_MESH_ENABLED?.trim().toLowerCase() === "false"
      || Boolean(bindings.INFERENCE_SCHEDULER),
    authentication: getAuthConfigurationIssues().length === 0,
  };
  const ok = Object.values(checks).every(Boolean);

  return Response.json(
    {
      ok,
      release: CURRENT_RELEASE_VERSION,
      checkedAt: new Date().toISOString(),
      checks,
    },
    {
      status: ok ? 200 : 503,
      headers: {
        "cache-control": "no-store",
        "x-tklabs-release": CURRENT_RELEASE_VERSION,
      },
    },
  );
}
