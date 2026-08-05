import { DurableObject, type DurableObjectState } from "cloudflare:workers";

import type { HealthCheck, HealthPayload, HealthStatus as HealthState } from "@/lib/provider-health";

type HealthStatusEnv = {
  CLODEX_ENABLED?: string;
  CLODEX_API_KEY?: string;
  NVIDIA_API_KEY_PRIMARY?: string;
  NVIDIA_API_KEY_SECONDARY?: string;
  NVIDIA_API_KEY_1?: string;
  NVIDIA_API_KEY?: string;
  AUTH_SECRET?: string;
  AUTH_GOOGLE_ID?: string;
  AUTH_GOOGLE_SECRET?: string;
  RATE_LIMIT_SECRET?: string;
  ACCOUNT_ID_SECRET?: string;
  CLODEX_ACCESS?: unknown;
};

type SnapshotRow = { payload: string; expires_at: number; stale_until: number };

const LIVE_TTL_MS = 60_000;
const STALE_TTL_MS = 5 * 60_000;
const PROVIDER_TIMEOUT_MS = 2_500;

function firstEnv(env: HealthStatusEnv, ...names: (keyof HealthStatusEnv)[]) {
  for (const name of names) {
    const value = typeof env[name] === "string" ? env[name]?.trim() : "";
    if (value) return value;
  }
  return "";
}

async function probe(url: string, headers: Record<string, string>): Promise<Pick<HealthCheck, "status" | "latencyMs">> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);
  const startedAt = Date.now();
  try {
    const response = await fetch(url, { method: "GET", headers, signal: controller.signal });
    const status: HealthState = response.ok ? "operational" : response.status < 500 ? "degraded" : "down";
    return { status, latencyMs: Date.now() - startedAt };
  } catch {
    return { status: "down", latencyMs: Date.now() - startedAt };
  } finally {
    clearTimeout(timeout);
  }
}

async function providerCheck(id: string, url: string, headers: Record<string, string>, configured: boolean, required = true): Promise<HealthCheck> {
  if (!configured) return { id, status: "not_configured", latencyMs: null, required };
  return { id, required, ...(await probe(url, headers)) };
}

async function buildHealth(env: HealthStatusEnv): Promise<Omit<HealthPayload, "source" | "stale">> {
  const nvidiaKey = firstEnv(env, "NVIDIA_API_KEY_PRIMARY", "NVIDIA_API_KEY_SECONDARY", "NVIDIA_API_KEY_1", "NVIDIA_API_KEY");
  const clodexKey = firstEnv(env, "CLODEX_API_KEY");
  const clodexEnabled = env.CLODEX_ENABLED?.trim().toLowerCase() === "true";
  const authConfigured = Boolean(firstEnv(env, "AUTH_SECRET") && firstEnv(env, "AUTH_GOOGLE_ID") && firstEnv(env, "AUTH_GOOGLE_SECRET"));
  const rateLimitConfigured = Boolean(env.CLODEX_ACCESS && firstEnv(env, "RATE_LIMIT_SECRET") && firstEnv(env, "ACCOUNT_ID_SECRET"));

  const checks = await Promise.all([
    providerCheck("inference", "https://integrate.api.nvidia.com/v1/models", nvidiaKey ? { authorization: `Bearer ${nvidiaKey}` } : {}, Boolean(nvidiaKey)),
    providerCheck("clodex", "https://clodex.xyz/v1/models", clodexKey ? { "anthropic-version": "2023-06-01", "x-api-key": clodexKey } : {}, clodexEnabled && Boolean(clodexKey), false),
    Promise.resolve<HealthCheck>({ id: "auth", status: authConfigured ? "operational" : "not_configured", latencyMs: null }),
    Promise.resolve<HealthCheck>({ id: "access", status: rateLimitConfigured ? "operational" : "not_configured", latencyMs: null }),
  ]);
  return {
    checkedAt: new Date().toISOString(),
    ok: checks.filter((check) => check.required !== false).every((check) => check.status === "operational"),
    services: checks,
  };
}

/** Shared status cache. Durable Object serialization provides single-flight
 * refreshes across Worker isolates without a process-local Map. */
export class HealthStatus extends DurableObject<HealthStatusEnv> {
  private refreshPromise: Promise<Omit<HealthPayload, "source" | "stale">> | null = null;

  constructor(ctx: DurableObjectState, env: HealthStatusEnv) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      this.ctx.storage.sql.exec("CREATE TABLE IF NOT EXISTS health_snapshot (slot INTEGER PRIMARY KEY CHECK (slot = 1), payload TEXT NOT NULL, expires_at INTEGER NOT NULL, stale_until INTEGER NOT NULL)");
    });
  }

  async getStatus(): Promise<HealthPayload> {
    const now = Date.now();
    const row = this.ctx.storage.sql.exec<SnapshotRow>("SELECT payload, expires_at, stale_until FROM health_snapshot WHERE slot = 1").toArray()[0];
    if (row && now < row.expires_at) {
      const cached = JSON.parse(row.payload) as Omit<HealthPayload, "source" | "stale">;
      return { ...cached, source: "cache", stale: false };
    }

    if (!this.refreshPromise) {
      this.refreshPromise = (async () => {
        const live = await buildHealth(this.env);
        this.ctx.storage.sql.exec("INSERT INTO health_snapshot (slot, payload, expires_at, stale_until) VALUES (1, ?, ?, ?) ON CONFLICT(slot) DO UPDATE SET payload = excluded.payload, expires_at = excluded.expires_at, stale_until = excluded.stale_until", JSON.stringify(live), now + LIVE_TTL_MS, now + STALE_TTL_MS);
        return live;
      })().finally(() => {
        this.refreshPromise = null;
      });
    }
    try {
      const live = await this.refreshPromise;
      return { ...live, source: "live", stale: false };
    } catch {
      if (row && now < row.stale_until) {
        const stale = JSON.parse(row.payload) as Omit<HealthPayload, "source" | "stale">;
        return { ...stale, source: "stale", stale: true };
      }
      throw new Error("health_refresh_failed");
    }
  }
}
