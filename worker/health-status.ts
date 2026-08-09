import { DurableObject, type DurableObjectState } from "cloudflare:workers";

import { getClodexModelConfig } from "@/lib/models/clodex-server";
import type { HealthCheck, HealthPayload, HealthStatus as HealthState } from "@/lib/provider-health";

type HealthStatusEnv = {
  CLODEX_ENABLED?: string;
  CLODEX_API_KEY?: string;
  NVIDIA_API_KEY_PRIMARY?: string;
  NVIDIA_API_KEY_SECONDARY?: string;
  NVIDIA_API_KEY_1?: string;
  NVIDIA_API_KEY?: string;
  GOOGLE_GEMINI_API_KEY?: string;
  GEMINI_API_KEY?: string;
  GOOGLE_DIRECT_GROUNDING_MODEL?: string;
  AUTH_SECRET?: string;
  AUTH_GOOGLE_ID?: string;
  AUTH_GOOGLE_SECRET?: string;
  RATE_LIMIT_SECRET?: string;
  ACCOUNT_ID_SECRET?: string;
  CLODEX_ACCESS?: unknown;
  CLODEX_MODEL_FAST?: string;
  CLODEX_MODEL_REASONING?: string;
  CLODEX_MODEL_PRO?: string;
};

type SnapshotRow = { payload: string; expires_at: number; stale_until: number };
type StoredHealth = Omit<HealthPayload, "source" | "stale">;

const LIVE_TTL_MS = 60_000;
const STALE_TTL_MS = 15 * 60_000;
const PROVIDER_TIMEOUT_MS = 2_500;
const PROVIDER_PROBE_ATTEMPTS = 2;
const PROVIDER_RETRY_DELAY_MS = 140;

function firstEnv(env: HealthStatusEnv, ...names: (keyof HealthStatusEnv)[]) {
  for (const name of names) {
    const value = typeof env[name] === "string" ? env[name]?.trim() : "";
    if (value) return value;
  }
  return "";
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseStoredHealth(payload: string): StoredHealth | null {
  try {
    const parsed = JSON.parse(payload) as Partial<StoredHealth>;
    if (
      typeof parsed.checkedAt !== "string"
      || typeof parsed.ok !== "boolean"
      || !Array.isArray(parsed.services)
      || parsed.services.some((service) => (
        !service
        || typeof service.id !== "string"
        || !["operational", "degraded", "down", "not_configured"].includes(service.status)
      ))
    ) return null;
    return parsed as StoredHealth;
  } catch {
    return null;
  }
}

async function probe(url: string, headers: Record<string, string>): Promise<Pick<HealthCheck, "status" | "latencyMs">> {
  const startedAt = Date.now();
  let lastStatus: HealthState = "down";

  for (let attempt = 1; attempt <= PROVIDER_PROBE_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        method: "GET",
        headers,
        signal: controller.signal,
        cache: "no-store",
      });
      if (response.ok) return { status: "operational", latencyMs: Date.now() - startedAt };
      lastStatus = response.status === 429 || response.status < 500 ? "degraded" : "down";
      if (lastStatus === "degraded") break;
    } catch {
      lastStatus = "down";
    } finally {
      clearTimeout(timeout);
    }

    if (attempt < PROVIDER_PROBE_ATTEMPTS) await delay(PROVIDER_RETRY_DELAY_MS * attempt);
  }

  return { status: lastStatus, latencyMs: Date.now() - startedAt };
}

async function providerCheck(id: string, url: string, headers: Record<string, string>, configured: boolean, required = true): Promise<HealthCheck> {
  if (!configured) return { id, status: "not_configured", latencyMs: null, required };
  return { id, required, ...(await probe(url, headers)) };
}

async function buildHealth(env: HealthStatusEnv): Promise<StoredHealth> {
  const nvidiaKey = firstEnv(env, "NVIDIA_API_KEY_PRIMARY", "NVIDIA_API_KEY_SECONDARY", "NVIDIA_API_KEY_1", "NVIDIA_API_KEY");
  const googleGroundingKey = firstEnv(env, "GOOGLE_GEMINI_API_KEY", "GEMINI_API_KEY");
  const googleDirectModel = firstEnv(env, "GOOGLE_DIRECT_GROUNDING_MODEL") || "gemini-3.6-flash";
  const clodexKey = firstEnv(env, "CLODEX_API_KEY");
  const clodexEnabled = env.CLODEX_ENABLED?.trim().toLowerCase() === "true";
  const clodexModelsConfigured = Boolean(getClodexModelConfig({
    requireRuntimeConfig: true,
    environment: env as Record<string, string | undefined>,
  }));
  const authConfigured = Boolean(firstEnv(env, "AUTH_SECRET") && firstEnv(env, "AUTH_GOOGLE_ID") && firstEnv(env, "AUTH_GOOGLE_SECRET"));
  const rateLimitConfigured = Boolean(env.CLODEX_ACCESS && firstEnv(env, "RATE_LIMIT_SECRET") && firstEnv(env, "ACCOUNT_ID_SECRET"));

  const checks = await Promise.all([
    providerCheck("inference", "https://integrate.api.nvidia.com/v1/models", nvidiaKey ? { authorization: `Bearer ${nvidiaKey}` } : {}, Boolean(nvidiaKey)),
    providerCheck(
      "google_grounding",
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(googleDirectModel)}`,
      googleGroundingKey ? { "x-goog-api-key": googleGroundingKey } : {},
      Boolean(googleGroundingKey),
      false,
    ),
    providerCheck("clodex", "https://clodex.xyz/v1/models", clodexKey ? { "anthropic-version": "2023-06-01", "x-api-key": clodexKey } : {}, clodexEnabled && clodexModelsConfigured && Boolean(clodexKey), false),
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
  private refreshPromise: Promise<StoredHealth> | null = null;

  constructor(ctx: DurableObjectState, env: HealthStatusEnv) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      this.ctx.storage.sql.exec("CREATE TABLE IF NOT EXISTS health_snapshot (slot INTEGER PRIMARY KEY CHECK (slot = 1), payload TEXT NOT NULL, expires_at INTEGER NOT NULL, stale_until INTEGER NOT NULL)");
    });
  }

  async getStatus(): Promise<HealthPayload> {
    const now = Date.now();
    const row = this.ctx.storage.sql.exec<SnapshotRow>("SELECT payload, expires_at, stale_until FROM health_snapshot WHERE slot = 1").toArray()[0];
    const stored = row ? parseStoredHealth(row.payload) : null;

    if (row && !stored) {
      this.ctx.storage.sql.exec("DELETE FROM health_snapshot WHERE slot = 1");
      console.warn("health.snapshot_corrupt", { action: "deleted" });
    }

    if (row && stored && now < row.expires_at) {
      return { ...stored, source: "cache", stale: false };
    }

    if (!this.refreshPromise) {
      this.refreshPromise = (async () => {
        const live = await buildHealth(this.env);
        const refreshedAt = Date.now();
        this.ctx.storage.sql.exec(
          "INSERT INTO health_snapshot (slot, payload, expires_at, stale_until) VALUES (1, ?, ?, ?) ON CONFLICT(slot) DO UPDATE SET payload = excluded.payload, expires_at = excluded.expires_at, stale_until = excluded.stale_until",
          JSON.stringify(live),
          refreshedAt + LIVE_TTL_MS,
          refreshedAt + STALE_TTL_MS,
        );
        return live;
      })().finally(() => {
        this.refreshPromise = null;
      });
    }

    try {
      const live = await this.refreshPromise;
      return { ...live, source: "live", stale: false };
    } catch (error) {
      if (row && stored && now < row.stale_until) {
        console.warn("health.refresh_failed", { fallback: "stale", reason: error instanceof Error ? error.message : "unknown" });
        return { ...stored, source: "stale", stale: true };
      }
      throw new Error("health_refresh_failed");
    }
  }
}
