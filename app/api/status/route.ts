import { env } from "cloudflare:workers";

import type { HealthStatusNamespace } from "@/lib/provider-health";

export const runtime = "edge";

export async function GET() {
  const namespace = (env as unknown as { HEALTH_STATUS?: HealthStatusNamespace }).HEALTH_STATUS;
  if (!namespace) {
    return Response.json(
      { error: "Health status is not configured." },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }

  try {
    const snapshot = await namespace.getByName("global").getStatus();
    return Response.json(snapshot, {
      headers: {
        "cache-control": "no-store",
        "x-health-cache": snapshot.source === "live" ? "miss" : snapshot.stale ? "stale" : "hit",
      },
    });
  } catch {
    return Response.json(
      { error: "Health status is temporarily unavailable." },
      { status: 503, headers: { "cache-control": "no-store", "x-health-cache": "empty" } },
    );
  }
}
