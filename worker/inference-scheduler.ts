import { DurableObject, type DurableObjectState } from "cloudflare:workers";

import type { ErmaProviderLane, ProviderLeaseOutcome, ProviderLeaseResult } from "@/lib/ai/providers/contracts";
import type { InferenceAcquireInput } from "@/lib/inference-scheduler";

type SchedulerEnv = {
  ERMA_GOOGLE_FAST_CONCURRENCY?: string;
  ERMA_GOOGLE_CORE_CONCURRENCY?: string;
  ERMA_CEREBRAS_CONCURRENCY?: string;
  ERMA_GROQ_CONCURRENCY?: string;
  ERMA_NVIDIA_CONCURRENCY?: string;
  ERMA_GOOGLE_FAST_RPM?: string;
  ERMA_GOOGLE_CORE_RPM?: string;
  ERMA_CEREBRAS_RPM?: string;
  ERMA_GROQ_RPM?: string;
  ERMA_NVIDIA_RPM?: string;
  ERMA_GOOGLE_FAST_TPM?: string;
  ERMA_GOOGLE_CORE_TPM?: string;
  ERMA_CEREBRAS_TPM?: string;
  ERMA_GROQ_TPM?: string;
  ERMA_NVIDIA_TPM?: string;
  ERMA_MAX_ACTIVE_PER_USER?: string;
};

type LaneConfig = { concurrency: number; rpm: number; tpm: number };
type LaneUsage = { active: number; recent: number; tokens: number };
type LaneState = { cooldownUntil: number; latencyEwma: number; failures: number };
type CandidateSnapshot = { lane: ErmaProviderLane; score: number };
type CountRow = { count: number };
type TimeRow = { value: number | null };
type LeaseRow = { lane: string };
type ActiveRow = { lane: string; count: number };
type HistoryRow = { lane: string; count: number; tokens: number };
type StateRow = { lane: string; cooldown_until: number; latency_ewma: number; failures: number };

type SchedulerSnapshot = {
  usage: Map<ErmaProviderLane, LaneUsage>;
  state: Map<ErmaProviderLane, LaneState>;
};

const LANES: readonly ErmaProviderLane[] = ["google-fast", "google-core", "cerebras", "groq", "nvidia"];
const WINDOW_MS = 60_000;
const LEASE_TTL_MS = 135_000;

function boundedInt(raw: string | undefined, fallback: number, min = 1, max = 10_000_000) {
  const parsed = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

function laneConfig(env: SchedulerEnv, lane: ErmaProviderLane): LaneConfig {
  switch (lane) {
    case "google-fast": return {
      concurrency: boundedInt(env.ERMA_GOOGLE_FAST_CONCURRENCY, 24),
      rpm: boundedInt(env.ERMA_GOOGLE_FAST_RPM, 30),
      tpm: boundedInt(env.ERMA_GOOGLE_FAST_TPM, 64_000),
    };
    case "google-core": return {
      concurrency: boundedInt(env.ERMA_GOOGLE_CORE_CONCURRENCY, 16),
      rpm: boundedInt(env.ERMA_GOOGLE_CORE_RPM, 30),
      tpm: boundedInt(env.ERMA_GOOGLE_CORE_TPM, 64_000),
    };
    case "cerebras": return {
      concurrency: boundedInt(env.ERMA_CEREBRAS_CONCURRENCY, 4),
      rpm: boundedInt(env.ERMA_CEREBRAS_RPM, 30),
      tpm: boundedInt(env.ERMA_CEREBRAS_TPM, 64_000),
    };
    case "groq": return {
      concurrency: boundedInt(env.ERMA_GROQ_CONCURRENCY, 4),
      rpm: boundedInt(env.ERMA_GROQ_RPM, 30),
      tpm: boundedInt(env.ERMA_GROQ_TPM, 8_000),
    };
    case "nvidia": return {
      concurrency: boundedInt(env.ERMA_NVIDIA_CONCURRENCY, 8),
      rpm: boundedInt(env.ERMA_NVIDIA_RPM, 30),
      tpm: boundedInt(env.ERMA_NVIDIA_TPM, 64_000),
    };
  }
}

function isLane(value: string): value is ErmaProviderLane {
  return LANES.includes(value as ErmaProviderLane);
}

function uniqueLanes(values: readonly ErmaProviderLane[]) {
  return values.filter((lane, index) => LANES.includes(lane) && values.indexOf(lane) === index);
}

function emptyUsage(): LaneUsage {
  return { active: 0, recent: 0, tokens: 0 };
}

function emptyState(): LaneState {
  return { cooldownUntil: 0, latencyEwma: 0, failures: 0 };
}

export class InferenceScheduler extends DurableObject<SchedulerEnv> {
  constructor(ctx: DurableObjectState, env: SchedulerEnv) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      this.ctx.storage.sql.exec("CREATE TABLE IF NOT EXISTS inference_leases (lease_id TEXT PRIMARY KEY, lane TEXT NOT NULL, fairness_key TEXT NOT NULL, expires_at INTEGER NOT NULL)");
      this.ctx.storage.sql.exec("CREATE INDEX IF NOT EXISTS inference_leases_lane_idx ON inference_leases(lane, expires_at)");
      this.ctx.storage.sql.exec("CREATE INDEX IF NOT EXISTS inference_leases_user_idx ON inference_leases(fairness_key, expires_at)");
      this.ctx.storage.sql.exec("CREATE TABLE IF NOT EXISTS inference_history (id INTEGER PRIMARY KEY AUTOINCREMENT, lane TEXT NOT NULL, granted_at INTEGER NOT NULL, token_cost INTEGER NOT NULL DEFAULT 0)");
      this.ctx.storage.sql.exec("CREATE INDEX IF NOT EXISTS inference_history_lane_idx ON inference_history(lane, granted_at)");
      this.ctx.storage.sql.exec("CREATE TABLE IF NOT EXISTS inference_lane_state (lane TEXT PRIMARY KEY, cooldown_until INTEGER NOT NULL DEFAULT 0, latency_ewma REAL NOT NULL DEFAULT 0, failures INTEGER NOT NULL DEFAULT 0)");
    });
  }

  private cleanup(now: number) {
    this.ctx.storage.sql.exec("DELETE FROM inference_leases WHERE expires_at <= ?", now);
    this.ctx.storage.sql.exec("DELETE FROM inference_history WHERE granted_at < ?", now - WINDOW_MS);
  }

  private snapshot(now: number): SchedulerSnapshot {
    const usage = new Map<ErmaProviderLane, LaneUsage>();
    const state = new Map<ErmaProviderLane, LaneState>();
    for (const lane of LANES) {
      usage.set(lane, emptyUsage());
      state.set(lane, emptyState());
    }

    const activeRows = this.ctx.storage.sql.exec<ActiveRow>(
      "SELECT lane, COUNT(*) AS count FROM inference_leases WHERE expires_at > ? GROUP BY lane",
      now,
    ).toArray();
    for (const row of activeRows) {
      if (!isLane(row.lane)) continue;
      usage.set(row.lane, { ...usage.get(row.lane)!, active: row.count });
    }

    const historyRows = this.ctx.storage.sql.exec<HistoryRow>(
      "SELECT lane, COUNT(*) AS count, COALESCE(SUM(token_cost), 0) AS tokens FROM inference_history WHERE granted_at >= ? GROUP BY lane",
      now - WINDOW_MS,
    ).toArray();
    for (const row of historyRows) {
      if (!isLane(row.lane)) continue;
      usage.set(row.lane, { ...usage.get(row.lane)!, recent: row.count, tokens: row.tokens });
    }

    const stateRows = this.ctx.storage.sql.exec<StateRow>(
      "SELECT lane, cooldown_until, latency_ewma, failures FROM inference_lane_state",
    ).toArray();
    for (const row of stateRows) {
      if (!isLane(row.lane)) continue;
      state.set(row.lane, {
        cooldownUntil: row.cooldown_until,
        latencyEwma: row.latency_ewma,
        failures: row.failures,
      });
    }
    return { usage, state };
  }

  private stateFor(lane: ErmaProviderLane) {
    const row = this.ctx.storage.sql.exec<StateRow>(
      "SELECT lane, cooldown_until, latency_ewma, failures FROM inference_lane_state WHERE lane = ?",
      lane,
    ).toArray()[0];
    return row
      ? { cooldownUntil: row.cooldown_until, latencyEwma: row.latency_ewma, failures: row.failures }
      : emptyState();
  }

  private loadMode(snapshot: SchedulerSnapshot, candidates: readonly ErmaProviderLane[]) {
    let active = 0;
    let recent = 0;
    let tokens = 0;
    let concurrencyCapacity = 0;
    let rpmCapacity = 0;
    let tpmCapacity = 0;
    for (const lane of candidates) {
      const config = laneConfig(this.env, lane);
      const usage = snapshot.usage.get(lane) ?? emptyUsage();
      active += usage.active;
      recent += usage.recent;
      tokens += usage.tokens;
      concurrencyCapacity += config.concurrency;
      rpmCapacity += config.rpm;
      tpmCapacity += config.tpm;
    }
    const pressure = Math.max(
      concurrencyCapacity ? active / concurrencyCapacity : 1,
      rpmCapacity ? recent / rpmCapacity : 1,
      tpmCapacity ? tokens / tpmCapacity : 1,
    );
    return pressure >= 0.85 ? "survival" as const : pressure >= 0.6 ? "high" as const : "normal" as const;
  }

  async acquire(input: InferenceAcquireInput): Promise<ProviderLeaseResult> {
    const now = Date.now();
    this.cleanup(now);
    const candidates = uniqueLanes(input.candidates);
    const snapshot = this.snapshot(now);
    const mode = candidates.length ? this.loadMode(snapshot, candidates) : "survival" as const;
    if (!candidates.length) return { granted: false, mode, retryAfterMs: 1_000 };

    const maxActivePerUser = boundedInt(this.env.ERMA_MAX_ACTIVE_PER_USER, 2, 1, 20);
    const userActive = this.ctx.storage.sql.exec<CountRow>(
      "SELECT COUNT(*) AS count FROM inference_leases WHERE fairness_key = ? AND expires_at > ?",
      input.fairnessKey,
      now,
    ).toArray()[0]?.count ?? 0;
    if (userActive >= maxActivePerUser) {
      const nextExpiry = this.ctx.storage.sql.exec<TimeRow>(
        "SELECT MIN(expires_at) AS value FROM inference_leases WHERE fairness_key = ? AND expires_at > ?",
        input.fairnessKey,
        now,
      ).toArray()[0]?.value;
      return { granted: false, mode, retryAfterMs: Math.max(100, Math.min(2_000, (nextExpiry ?? now + 500) - now)) };
    }

    const estimatedTokens = Math.max(1, Math.min(250_000, Math.round(input.estimatedTokens)));
    const eligible: CandidateSnapshot[] = [];
    for (const [priority, lane] of candidates.entries()) {
      const config = laneConfig(this.env, lane);
      const usage = snapshot.usage.get(lane) ?? emptyUsage();
      const laneState = snapshot.state.get(lane) ?? emptyState();
      if (
        laneState.cooldownUntil > now
        || usage.active >= config.concurrency
        || usage.recent >= config.rpm
        || usage.tokens + estimatedTokens > config.tpm
      ) continue;
      const score = priority * 18
        + (usage.active / config.concurrency) * 14
        + (usage.recent / config.rpm) * 12
        + (usage.tokens / config.tpm) * 12
        + Math.min(12, laneState.latencyEwma / 1_000)
        + Math.min(20, laneState.failures * 4);
      eligible.push({ lane, score });
    }

    eligible.sort((left, right) => left.score - right.score);
    const selected = eligible[0];
    if (!selected) {
      let retryAfterMs = 1_000;
      for (const lane of candidates) {
        const config = laneConfig(this.env, lane);
        const usage = snapshot.usage.get(lane) ?? emptyUsage();
        const laneState = snapshot.state.get(lane) ?? emptyState();
        if (laneState.cooldownUntil > now) retryAfterMs = Math.min(retryAfterMs, Math.max(100, laneState.cooldownUntil - now));
        if (usage.recent >= config.rpm || usage.tokens + estimatedTokens > config.tpm) {
          const oldest = this.ctx.storage.sql.exec<TimeRow>(
            "SELECT MIN(granted_at) AS value FROM inference_history WHERE lane = ? AND granted_at >= ?",
            lane,
            now - WINDOW_MS,
          ).toArray()[0]?.value;
          if (oldest) retryAfterMs = Math.min(retryAfterMs, Math.max(100, oldest + WINDOW_MS - now));
        }
      }
      return { granted: false, mode, retryAfterMs: Math.min(5_000, retryAfterMs) };
    }

    const leaseId = crypto.randomUUID();
    this.ctx.storage.sql.exec(
      "INSERT INTO inference_leases (lease_id, lane, fairness_key, expires_at) VALUES (?, ?, ?, ?)",
      leaseId,
      selected.lane,
      input.fairnessKey,
      now + LEASE_TTL_MS,
    );
    this.ctx.storage.sql.exec(
      "INSERT INTO inference_history (lane, granted_at, token_cost) VALUES (?, ?, ?)",
      selected.lane,
      now,
      estimatedTokens,
    );

    const selectedUsage = snapshot.usage.get(selected.lane) ?? emptyUsage();
    snapshot.usage.set(selected.lane, {
      active: selectedUsage.active + 1,
      recent: selectedUsage.recent + 1,
      tokens: selectedUsage.tokens + estimatedTokens,
    });
    return { granted: true, lease: { leaseId, lane: selected.lane, mode: this.loadMode(snapshot, candidates) } };
  }

  async release(outcome: ProviderLeaseOutcome) {
    const now = Date.now();
    this.cleanup(now);
    const lease = this.ctx.storage.sql.exec<LeaseRow>(
      "SELECT lane FROM inference_leases WHERE lease_id = ?",
      outcome.leaseId,
    ).toArray()[0];
    if (!lease || !isLane(lease.lane)) return;
    this.ctx.storage.sql.exec("DELETE FROM inference_leases WHERE lease_id = ?", outcome.leaseId);

    const previous = this.stateFor(lease.lane);
    const latency = Math.max(0, Math.min(120_000, Math.round(outcome.latencyMs)));
    const latencyEwma = previous.latencyEwma > 0 ? previous.latencyEwma * 0.72 + latency * 0.28 : latency;
    const status = outcome.status ?? 0;
    const failures = outcome.ok ? Math.max(0, previous.failures - 1) : Math.min(10, previous.failures + 1);
    let cooldownUntil = outcome.ok ? Math.min(previous.cooldownUntil, now) : previous.cooldownUntil;
    if (!outcome.ok) {
      if (status === 429) cooldownUntil = Math.max(cooldownUntil, now + 60_000);
      else if (status === 401 || status === 402 || status === 403) cooldownUntil = Math.max(cooldownUntil, now + 5 * 60_000);
      else if (status >= 500 || status === 0) cooldownUntil = Math.max(cooldownUntil, now + Math.min(60_000, 5_000 * Math.max(1, failures)));
    }

    this.ctx.storage.sql.exec(
      "INSERT INTO inference_lane_state (lane, cooldown_until, latency_ewma, failures) VALUES (?, ?, ?, ?) ON CONFLICT(lane) DO UPDATE SET cooldown_until = excluded.cooldown_until, latency_ewma = excluded.latency_ewma, failures = excluded.failures",
      lease.lane,
      cooldownUntil,
      latencyEwma,
      failures,
    );
  }
}
