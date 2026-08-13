import { DurableObject, type DurableObjectState } from "cloudflare:workers";

import {
  CLODEX_REQUEST_LIMIT,
  CLODEX_REQUEST_WINDOW_MS,
  type ClodexAccessStatus,
  type ClodexConsumeResult,
  type ClodexRedeemResult,
  type ClodexReleaseResult,
  type ClodexRevokeResult,
} from "@/lib/clodex-access";
import {
  DEMO_REQUEST_LIMIT,
  DEMO_REQUEST_WINDOW_MS,
  type DemoReleaseResult,
  type DemoReservationResult,
} from "@/lib/demo-rate-limit";
import {
  TTS_REQUEST_WINDOW_MS,
  TTS_RESERVATION_TTL_MS,
  getTtsPolicy,
  type TtsReservationReleaseResult,
  type TtsReservationResult,
} from "@/lib/tts-rate-limit";
import { canCommitReservation, reservationExpiresAt } from "@/lib/reservation-policy";
import {
  REWARD_AD_COOLDOWN_MS,
  REWARD_AD_DAILY_LIMIT,
  REWARD_AD_MIN_VIEW_MS,
  REWARD_AD_SESSION_ATTEMPT_LIMIT,
  REWARD_AD_SESSION_TTL_MS,
  REWARD_ADS_PER_REQUEST,
  REWARD_BONUS_REQUEST_LIMIT,
  rewardedAdsEnabled,
  type RewardAdCancelResult,
  type RewardAdCompleteResult,
  type RewardAdStartResult,
  type RewardAdStatus,
} from "@/lib/rewarded-ads";

type ClodexAccessEnv = {
  CLODEX_ACCESS_CODE?: string;
  CLODEX_GRANT_TTL_DAYS?: string;
  CLODEX_GRANT_VERSION?: string;
  TTS_REQUEST_LIMIT?: string;
  TTS_DAILY_CHARACTER_QUOTA?: string;
  TTS_PRIVILEGED_REQUEST_LIMIT?: string;
  TTS_PRIVILEGED_DAILY_CHARACTER_QUOTA?: string;
  REWARDED_ADS_ENABLED?: string;
};

type UsageRow = {
  window_start: number;
  request_count: number;
};

type ReservationRow = {
  reservation_id: string;
  window_start: number;
  released: number;
};

type DemoReservationRow = {
  reservation_id: string;
  window_start: number;
  created_at: number | null;
  expires_at: number | null;
  state: "reserved" | "committed" | "released" | "expired";
  source: "base" | "reward";
};

type RewardAdUsageRow = {
  window_start: number;
  ads_completed: number;
  bonus_balance: number;
  last_completed_at: number | null;
};

type RewardAdSessionRow = {
  session_id: string;
  window_start: number;
  started_at: number;
  eligible_at: number;
  expires_at: number;
  state: "active" | "completed" | "cancelled" | "expired";
  credited: number;
};

type TtsUsageRow = {
  window_start: number;
  request_count: number;
  day_start: number;
  character_count: number;
};

type TtsReservationRow = {
  reservation_id: string;
  day_start: number;
  characters: number;
  created_at: number | null;
  expires_at: number | null;
  state: "reserved" | "committed" | "released" | "expired";
};

type GrantRow = {
  activated_at: number;
  expires_at: number | null;
  revoked_at: number | null;
  grant_version: string;
};

type AttemptRow = {
  window_start: number;
  attempt_count: number;
};

const REDEMPTION_ATTEMPT_LIMIT = 5;
const DEFAULT_GRANT_TTL_DAYS = 30;
const DEFAULT_GRANT_VERSION = "v2";
const RESERVATION_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const CLEANUP_BATCH_SIZE = 100;

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;

  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

/**
 * One object is created per signed-in account. Its SQLite state makes the
 * entitlement, provider reservations and rate limits durable across isolates.
 */
export class ClodexAccess extends DurableObject<ClodexAccessEnv> {
  constructor(ctx: DurableObjectState, env: ClodexAccessEnv) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => this.migrate());
  }

  private migrate() {
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS access_grants (
        slot INTEGER PRIMARY KEY CHECK (slot = 1),
        activated_at INTEGER NOT NULL,
        expires_at INTEGER,
        revoked_at INTEGER,
        grant_version TEXT NOT NULL DEFAULT 'v1'
      );
      CREATE TABLE IF NOT EXISTS request_windows (
        slot INTEGER PRIMARY KEY CHECK (slot = 1),
        window_start INTEGER NOT NULL,
        request_count INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS clodex_request_windows (
        slot INTEGER PRIMARY KEY CHECK (slot = 1),
        window_start INTEGER NOT NULL,
        request_count INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS demo_request_windows (
        slot INTEGER PRIMARY KEY CHECK (slot = 1),
        window_start INTEGER NOT NULL,
        request_count INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS clodex_reservations (
        reservation_id TEXT PRIMARY KEY,
        window_start INTEGER NOT NULL,
        released INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS demo_reservations (
        reservation_id TEXT PRIMARY KEY,
        window_start INTEGER NOT NULL,
        created_at INTEGER,
        expires_at INTEGER,
        state TEXT NOT NULL CHECK (state IN ('reserved', 'committed', 'released', 'expired')),
        source TEXT NOT NULL DEFAULT 'base' CHECK (source IN ('base', 'reward'))
      );
      CREATE TABLE IF NOT EXISTS reward_ad_usage (
        slot INTEGER PRIMARY KEY CHECK (slot = 1),
        window_start INTEGER NOT NULL,
        ads_completed INTEGER NOT NULL,
        bonus_balance INTEGER NOT NULL,
        last_completed_at INTEGER
      );
      CREATE TABLE IF NOT EXISTS reward_ad_sessions (
        session_id TEXT PRIMARY KEY,
        window_start INTEGER NOT NULL,
        started_at INTEGER NOT NULL,
        eligible_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        state TEXT NOT NULL CHECK (state IN ('active', 'completed', 'cancelled', 'expired')),
        credited INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS tts_usage (
        slot INTEGER PRIMARY KEY CHECK (slot = 1),
        window_start INTEGER NOT NULL,
        request_count INTEGER NOT NULL,
        day_start INTEGER NOT NULL,
        character_count INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS tts_reservations (
        reservation_id TEXT PRIMARY KEY,
        day_start INTEGER NOT NULL,
        characters INTEGER NOT NULL,
        created_at INTEGER,
        expires_at INTEGER,
        state TEXT NOT NULL CHECK (state IN ('reserved', 'committed', 'released', 'expired'))
      );
      CREATE TABLE IF NOT EXISTS redemption_attempts (
        slot INTEGER PRIMARY KEY CHECK (slot = 1),
        window_start INTEGER NOT NULL,
        attempt_count INTEGER NOT NULL
      );
      INSERT OR IGNORE INTO clodex_request_windows (slot, window_start, request_count)
        SELECT slot, window_start, request_count FROM request_windows;
    `);

    // Existing objects were created with the pre-hardening schema. SQLite has
    // no portable IF NOT EXISTS for ALTER TABLE, so each additive migration is
    // attempted independently and is safe to retry on every isolate startup.
    for (const statement of [
      "ALTER TABLE access_grants ADD COLUMN expires_at INTEGER",
      "ALTER TABLE access_grants ADD COLUMN revoked_at INTEGER",
      "ALTER TABLE access_grants ADD COLUMN grant_version TEXT NOT NULL DEFAULT 'v1'",
      "ALTER TABLE demo_reservations ADD COLUMN created_at INTEGER",
      "ALTER TABLE demo_reservations ADD COLUMN expires_at INTEGER",
      "ALTER TABLE demo_reservations ADD COLUMN source TEXT NOT NULL DEFAULT 'base' CHECK (source IN ('base', 'reward'))",
      "ALTER TABLE tts_reservations ADD COLUMN created_at INTEGER",
      "ALTER TABLE tts_reservations ADD COLUMN expires_at INTEGER",
    ]) {
      try {
        this.ctx.storage.sql.exec(statement);
      } catch (error) {
        // Additive migrations are retried on every isolate startup. Only the
        // expected duplicate-column error is safe to ignore.
        if (!(error instanceof Error && /duplicate column name|already exists/i.test(error.message))) throw error;
      }
    }
    const demoSchema = this.ctx.storage.sql.exec<{ sql: string }>("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'demo_reservations'").toArray()[0]?.sql ?? "";
    if (demoSchema && !demoSchema.includes("'expired'")) {
      this.ctx.storage.sql.exec("ALTER TABLE demo_reservations RENAME TO demo_reservations_legacy");
      this.ctx.storage.sql.exec(`CREATE TABLE demo_reservations (
        reservation_id TEXT PRIMARY KEY,
        window_start INTEGER NOT NULL,
        created_at INTEGER,
        expires_at INTEGER,
        state TEXT NOT NULL CHECK (state IN ('reserved', 'committed', 'released', 'expired')),
        source TEXT NOT NULL DEFAULT 'base' CHECK (source IN ('base', 'reward'))
      )`);
      this.ctx.storage.sql.exec("INSERT INTO demo_reservations (reservation_id, window_start, created_at, expires_at, state, source) SELECT reservation_id, window_start, window_start, window_start + ?, state, 'base' FROM demo_reservations_legacy", TTS_RESERVATION_TTL_MS);
      this.ctx.storage.sql.exec("DROP TABLE demo_reservations_legacy");
    }
    const ttsSchema = this.ctx.storage.sql.exec<{ sql: string }>("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'tts_reservations'").toArray()[0]?.sql ?? "";
    if (ttsSchema && !ttsSchema.includes("'expired'")) {
      this.ctx.storage.sql.exec("ALTER TABLE tts_reservations RENAME TO tts_reservations_legacy");
      this.ctx.storage.sql.exec(`CREATE TABLE tts_reservations (
        reservation_id TEXT PRIMARY KEY,
        day_start INTEGER NOT NULL,
        characters INTEGER NOT NULL,
        created_at INTEGER,
        expires_at INTEGER,
        state TEXT NOT NULL CHECK (state IN ('reserved', 'committed', 'released', 'expired'))
      )`);
      this.ctx.storage.sql.exec("INSERT INTO tts_reservations (reservation_id, day_start, characters, created_at, expires_at, state) SELECT reservation_id, day_start, characters, day_start, day_start + ?, state FROM tts_reservations_legacy", TTS_RESERVATION_TTL_MS);
      this.ctx.storage.sql.exec("DROP TABLE tts_reservations_legacy");
    }
    // If an isolate was terminated between a rename and the replacement
    // table, finish that migration safely on its next startup.
    const demoLegacyExists = this.ctx.storage.sql.exec<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'demo_reservations_legacy'").toArray().length > 0;
    if (demoLegacyExists) {
      this.ctx.storage.sql.exec("CREATE TABLE IF NOT EXISTS demo_reservations (reservation_id TEXT PRIMARY KEY, window_start INTEGER NOT NULL, created_at INTEGER, expires_at INTEGER, state TEXT NOT NULL CHECK (state IN ('reserved', 'committed', 'released', 'expired')), source TEXT NOT NULL DEFAULT 'base' CHECK (source IN ('base', 'reward')))");
      this.ctx.storage.sql.exec("INSERT OR IGNORE INTO demo_reservations (reservation_id, window_start, created_at, expires_at, state, source) SELECT reservation_id, window_start, COALESCE(created_at, window_start), COALESCE(expires_at, window_start + ?), state, 'base' FROM demo_reservations_legacy", TTS_RESERVATION_TTL_MS);
      this.ctx.storage.sql.exec("DROP TABLE demo_reservations_legacy");
    }
    const ttsLegacyExists = this.ctx.storage.sql.exec<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'tts_reservations_legacy'").toArray().length > 0;
    if (ttsLegacyExists) {
      this.ctx.storage.sql.exec("CREATE TABLE IF NOT EXISTS tts_reservations (reservation_id TEXT PRIMARY KEY, day_start INTEGER NOT NULL, characters INTEGER NOT NULL, created_at INTEGER, expires_at INTEGER, state TEXT NOT NULL CHECK (state IN ('reserved', 'committed', 'released', 'expired')))");
      this.ctx.storage.sql.exec("INSERT OR IGNORE INTO tts_reservations (reservation_id, day_start, characters, created_at, expires_at, state) SELECT reservation_id, day_start, characters, COALESCE(created_at, day_start), COALESCE(expires_at, day_start + ?), state FROM tts_reservations_legacy", TTS_RESERVATION_TTL_MS);
      this.ctx.storage.sql.exec("DROP TABLE tts_reservations_legacy");
    }
    this.ctx.storage.sql.exec("UPDATE demo_reservations SET created_at = COALESCE(created_at, window_start), expires_at = COALESCE(expires_at, window_start + ?)", TTS_RESERVATION_TTL_MS);
    this.ctx.storage.sql.exec("UPDATE tts_reservations SET created_at = COALESCE(created_at, day_start), expires_at = COALESCE(expires_at, day_start + ?)", TTS_RESERVATION_TTL_MS);
  }

  private grant() {
    return this.ctx.storage.sql.exec<GrantRow>(
      "SELECT activated_at, expires_at, revoked_at, grant_version FROM access_grants WHERE slot = 1",
    ).toArray()[0] ?? null;
  }

  private isActive(now = Date.now()) {
    const grant = this.grant();
    return Boolean(grant && grant.grant_version === this.grantVersion() && !grant.revoked_at && (grant.expires_at === null || grant.expires_at > now));
  }

  private currentUsage(now: number, table: "clodex_request_windows" | "demo_request_windows", windowMs: number) {
    const row = this.ctx.storage.sql.exec<UsageRow>(`SELECT window_start, request_count FROM ${table} WHERE slot = 1`).toArray()[0];
    if (!row || now - row.window_start >= windowMs) return null;
    return row;
  }

  private status(now = Date.now()): ClodexAccessStatus {
    const usage = this.currentUsage(now, "clodex_request_windows", CLODEX_REQUEST_WINDOW_MS);
    const grant = this.grant();
    return {
      hasGrant: Boolean(grant),
      active: this.isActive(now),
      limit: CLODEX_REQUEST_LIMIT,
      windowMs: CLODEX_REQUEST_WINDOW_MS,
      remaining: usage ? Math.max(0, CLODEX_REQUEST_LIMIT - usage.request_count) : CLODEX_REQUEST_LIMIT,
      resetAt: usage ? usage.window_start + CLODEX_REQUEST_WINDOW_MS : null,
      activatedAt: grant?.activated_at ?? null,
      expiresAt: grant?.expires_at ?? null,
      revokedAt: grant?.revoked_at ?? null,
      grantVersion: grant?.grant_version ?? null,
    };
  }

  private grantVersion() {
    const configured = this.env.CLODEX_GRANT_VERSION?.trim();
    return configured && /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(configured) ? configured : DEFAULT_GRANT_VERSION;
  }

  private failedAttemptStatus(now: number) {
    const row = this.ctx.storage.sql.exec<AttemptRow>("SELECT window_start, attempt_count FROM redemption_attempts WHERE slot = 1").toArray()[0];
    if (!row || now - row.window_start >= CLODEX_REQUEST_WINDOW_MS) return null;
    return row;
  }

  private recordFailedAttempt(now: number) {
    const existing = this.failedAttemptStatus(now);
    const windowStart = existing?.window_start ?? now;
    const attemptCount = (existing?.attempt_count ?? 0) + 1;
    this.ctx.storage.sql.exec(
      "INSERT INTO redemption_attempts (slot, window_start, attempt_count) VALUES (1, ?, ?) ON CONFLICT(slot) DO UPDATE SET window_start = excluded.window_start, attempt_count = excluded.attempt_count",
      windowStart,
      attemptCount,
    );
    return { windowStart, attemptCount };
  }

  private grantTtlMs() {
    const configuredDays = Number(this.env.CLODEX_GRANT_TTL_DAYS);
    const days = Number.isFinite(configuredDays) && configuredDays >= 1 && configuredDays <= 3_650
      ? Math.floor(configuredDays)
      : DEFAULT_GRANT_TTL_DAYS;
    return days * 24 * 60 * 60 * 1000;
  }

  async getStatus(): Promise<ClodexAccessStatus> {
    return this.status();
  }

  async redeem(code: string): Promise<ClodexRedeemResult> {
    const now = Date.now();
    if (this.isActive(now)) return { ...this.status(now), redeemed: true };

    const expectedCode = this.env.CLODEX_ACCESS_CODE?.trim();
    if (!expectedCode) return { ...this.status(now), redeemed: false, error: "not_configured" };

    const attempts = this.failedAttemptStatus(now);
    if (attempts && attempts.attempt_count >= REDEMPTION_ATTEMPT_LIMIT) {
      return {
        ...this.status(now),
        redeemed: false,
        error: "too_many_attempts",
        retryAt: attempts.window_start + CLODEX_REQUEST_WINDOW_MS,
      };
    }

    if (!constantTimeEqual(code.trim(), expectedCode)) {
      const updatedAttempts = this.recordFailedAttempt(now);
      return {
        ...this.status(now),
        redeemed: false,
        error: "invalid_code",
        ...(updatedAttempts.attemptCount >= REDEMPTION_ATTEMPT_LIMIT
          ? { retryAt: updatedAttempts.windowStart + CLODEX_REQUEST_WINDOW_MS }
          : {}),
      };
    }

    this.ctx.storage.sql.exec(
      "INSERT INTO access_grants (slot, activated_at, expires_at, revoked_at, grant_version) VALUES (1, ?, ?, NULL, ?) ON CONFLICT(slot) DO UPDATE SET activated_at = excluded.activated_at, expires_at = excluded.expires_at, revoked_at = NULL, grant_version = excluded.grant_version",
      now,
      now + this.grantTtlMs(),
      this.grantVersion(),
    );
    this.ctx.storage.sql.exec("DELETE FROM redemption_attempts WHERE slot = 1");
    return { ...this.status(now), redeemed: true };
  }

  async revoke(): Promise<ClodexRevokeResult> {
    const now = Date.now();
    const grant = this.grant();
    if (!grant || grant.revoked_at) return { ...this.status(now), revoked: false };
    this.ctx.storage.sql.exec("UPDATE access_grants SET revoked_at = ? WHERE slot = 1", now);
    return { ...this.status(now), revoked: true };
  }

  async consume(): Promise<ClodexConsumeResult> {
    const now = Date.now();
    this.cleanupReservations(now);
    if (!this.isActive(now)) return { ...this.status(now), allowed: false, error: "access_required" };

    const existing = this.currentUsage(now, "clodex_request_windows", CLODEX_REQUEST_WINDOW_MS);
    if (existing && existing.request_count >= CLODEX_REQUEST_LIMIT) {
      return {
        ...this.status(now),
        allowed: false,
        error: "limit_reached",
        retryAt: existing.window_start + CLODEX_REQUEST_WINDOW_MS,
      };
    }

    const windowStart = existing?.window_start ?? now;
    const requestCount = (existing?.request_count ?? 0) + 1;
    const reservationId = crypto.randomUUID();
    this.ctx.storage.sql.exec(
      "INSERT INTO clodex_request_windows (slot, window_start, request_count) VALUES (1, ?, ?) ON CONFLICT(slot) DO UPDATE SET window_start = excluded.window_start, request_count = excluded.request_count",
      windowStart,
      requestCount,
    );
    this.ctx.storage.sql.exec(
      "INSERT INTO clodex_reservations (reservation_id, window_start, released) VALUES (?, ?, 0)",
      reservationId,
      windowStart,
    );

    return {
      ...this.status(now),
      active: true,
      remaining: Math.max(0, CLODEX_REQUEST_LIMIT - requestCount),
      resetAt: windowStart + CLODEX_REQUEST_WINDOW_MS,
      allowed: true,
      reservationId,
    };
  }

  private rewardAdUsage(now: number): RewardAdUsageRow {
    const demoUsage = this.currentUsage(now, "demo_request_windows", DEMO_REQUEST_WINDOW_MS);
    const windowStart = demoUsage?.window_start ?? now;
    const existing = this.ctx.storage.sql.exec<RewardAdUsageRow>("SELECT window_start, ads_completed, bonus_balance, last_completed_at FROM reward_ad_usage WHERE slot = 1").toArray()[0];
    if (existing && existing.window_start === windowStart && now - existing.window_start < DEMO_REQUEST_WINDOW_MS) return existing;
    const fresh: RewardAdUsageRow = { window_start: windowStart, ads_completed: 0, bonus_balance: 0, last_completed_at: null };
    this.ctx.storage.sql.exec(
      "INSERT INTO reward_ad_usage (slot, window_start, ads_completed, bonus_balance, last_completed_at) VALUES (1, ?, 0, 0, NULL) ON CONFLICT(slot) DO UPDATE SET window_start = excluded.window_start, ads_completed = 0, bonus_balance = 0, last_completed_at = NULL",
      windowStart,
    );
    return fresh;
  }

  private rewardAdStatus(now = Date.now()): RewardAdStatus {
    const demoUsage = this.currentUsage(now, "demo_request_windows", DEMO_REQUEST_WINDOW_MS);
    const reward = this.rewardAdUsage(now);
    const baseRemaining = demoUsage ? Math.max(0, DEMO_REQUEST_LIMIT - demoUsage.request_count) : DEMO_REQUEST_LIMIT;
    const nextAdAt = reward.last_completed_at === null ? null : reward.last_completed_at + REWARD_AD_COOLDOWN_MS;
    const enabled = rewardedAdsEnabled(this.env);
    return {
      enabled,
      adsPerRequest: REWARD_ADS_PER_REQUEST,
      dailyAdLimit: REWARD_AD_DAILY_LIMIT,
      adsCompleted: reward.ads_completed,
      adsTowardNextRequest: reward.ads_completed % REWARD_ADS_PER_REQUEST,
      adsRemaining: Math.max(0, REWARD_AD_DAILY_LIMIT - reward.ads_completed),
      bonusRequests: reward.bonus_balance,
      bonusRequestLimit: REWARD_BONUS_REQUEST_LIMIT,
      resetAt: reward.window_start + DEMO_REQUEST_WINDOW_MS,
      nextAdAt,
      canStart: enabled && baseRemaining === 0 && reward.bonus_balance === 0 && reward.ads_completed < REWARD_AD_DAILY_LIMIT && (nextAdAt === null || nextAdAt <= now),
    };
  }

  private demoStatus(now = Date.now()): DemoReservationResult {
    const usage = this.currentUsage(now, "demo_request_windows", DEMO_REQUEST_WINDOW_MS);
    const reward = this.rewardAdUsage(now);
    const baseRemaining = usage ? Math.max(0, DEMO_REQUEST_LIMIT - usage.request_count) : DEMO_REQUEST_LIMIT;
    return {
      limit: DEMO_REQUEST_LIMIT,
      windowMs: DEMO_REQUEST_WINDOW_MS,
      remaining: baseRemaining + reward.bonus_balance,
      baseRemaining,
      bonusRemaining: reward.bonus_balance,
      resetAt: usage ? usage.window_start + DEMO_REQUEST_WINDOW_MS : null,
      allowed: true,
    };
  }

  /** Expire in-flight reservations and refund their counters before a new reservation. */
  private cleanupReservations(now: number) {
    const demoExpired = this.ctx.storage.sql.exec<DemoReservationRow>(
      "SELECT reservation_id, window_start, created_at, expires_at, state, source FROM demo_reservations WHERE state = 'reserved' AND COALESCE(expires_at, created_at + ?) <= ? LIMIT ?",
      TTS_RESERVATION_TTL_MS,
      now,
      CLEANUP_BATCH_SIZE,
    ).toArray();
    for (const reservation of demoExpired) {
      if (reservation.source === "reward") {
        const reward = this.rewardAdUsage(now);
        if (reward.window_start === reservation.window_start) this.ctx.storage.sql.exec("UPDATE reward_ad_usage SET bonus_balance = MIN(?, bonus_balance + 1) WHERE slot = 1", REWARD_BONUS_REQUEST_LIMIT);
      } else {
        const usage = this.currentUsage(now, "demo_request_windows", DEMO_REQUEST_WINDOW_MS);
        if (usage?.window_start === reservation.window_start) {
          if (usage.request_count <= 1) this.ctx.storage.sql.exec("DELETE FROM demo_request_windows WHERE slot = 1");
          else this.ctx.storage.sql.exec("UPDATE demo_request_windows SET request_count = ? WHERE slot = 1", usage.request_count - 1);
        }
      }
      this.ctx.storage.sql.exec("UPDATE demo_reservations SET state = 'expired' WHERE reservation_id = ? AND state = 'reserved'", reservation.reservation_id);
    }

    const ttsExpired = this.ctx.storage.sql.exec<TtsReservationRow>(
      "SELECT reservation_id, day_start, characters, created_at, expires_at, state FROM tts_reservations WHERE state = 'reserved' AND COALESCE(expires_at, created_at + ?) <= ? LIMIT ?",
      TTS_RESERVATION_TTL_MS,
      now,
      CLEANUP_BATCH_SIZE,
    ).toArray();
    for (const reservation of ttsExpired) {
      const usage = this.ttsUsage(now);
      if (usage.day_start === reservation.day_start) {
        this.ctx.storage.sql.exec("UPDATE tts_usage SET request_count = ?, character_count = ? WHERE slot = 1", Math.max(0, usage.request_count - 1), Math.max(0, usage.character_count - reservation.characters));
      }
      this.ctx.storage.sql.exec("UPDATE tts_reservations SET state = 'expired' WHERE reservation_id = ? AND state = 'reserved'", reservation.reservation_id);
    }

    const cutoff = now - RESERVATION_RETENTION_MS;
    this.ctx.storage.sql.exec("UPDATE reward_ad_sessions SET state = 'expired' WHERE state = 'active' AND expires_at <= ?", now);
    this.ctx.storage.sql.exec("DELETE FROM clodex_reservations WHERE window_start < ? LIMIT ?", now - CLODEX_REQUEST_WINDOW_MS, CLEANUP_BATCH_SIZE);
    this.ctx.storage.sql.exec("DELETE FROM demo_reservations WHERE state != 'reserved' AND COALESCE(created_at, window_start) < ? LIMIT ?", cutoff, CLEANUP_BATCH_SIZE);
    this.ctx.storage.sql.exec("DELETE FROM reward_ad_sessions WHERE state != 'active' AND started_at < ? LIMIT ?", cutoff, CLEANUP_BATCH_SIZE);
    this.ctx.storage.sql.exec("DELETE FROM tts_reservations WHERE state != 'reserved' AND COALESCE(created_at, day_start) < ? LIMIT ?", cutoff, CLEANUP_BATCH_SIZE);
  }

  async reserveDemo(): Promise<DemoReservationResult> {
    const now = Date.now();
    this.cleanupReservations(now);
    const existing = this.currentUsage(now, "demo_request_windows", DEMO_REQUEST_WINDOW_MS);
    const windowStart = existing?.window_start ?? now;
    let source: "base" | "reward";
    let requestCount = existing?.request_count ?? 0;
    if (requestCount < DEMO_REQUEST_LIMIT) {
      source = "base";
      requestCount += 1;
      this.ctx.storage.sql.exec(
        "INSERT INTO demo_request_windows (slot, window_start, request_count) VALUES (1, ?, ?) ON CONFLICT(slot) DO UPDATE SET window_start = excluded.window_start, request_count = excluded.request_count",
        windowStart,
        requestCount,
      );
    } else {
      const reward = this.rewardAdUsage(now);
      if (reward.bonus_balance <= 0) return { ...this.demoStatus(now), allowed: false };
      source = "reward";
      this.ctx.storage.sql.exec("UPDATE reward_ad_usage SET bonus_balance = MAX(0, bonus_balance - 1) WHERE slot = 1 AND bonus_balance > 0");
    }
    const reservationId = crypto.randomUUID();
    this.ctx.storage.sql.exec("INSERT INTO demo_reservations (reservation_id, window_start, created_at, expires_at, state, source) VALUES (?, ?, ?, ?, 'reserved', ?)", reservationId, windowStart, now, reservationExpiresAt(now), source);
    return { ...this.demoStatus(now), resetAt: windowStart + DEMO_REQUEST_WINDOW_MS, reservationId };
  }

  async commitDemo(reservationId: string): Promise<DemoReservationResult> {
    const now = Date.now();
    this.cleanupReservations(now);
    const reservation = this.ctx.storage.sql.exec<DemoReservationRow>("SELECT reservation_id, window_start, created_at, expires_at, state, source FROM demo_reservations WHERE reservation_id = ?", reservationId).toArray()[0];
    if (!reservation) return { ...this.demoStatus(now), allowed: false, reservationId, committed: false };
    if (reservation.state === "committed") return { ...this.demoStatus(now), reservationId, committed: true };
    const expiresAt = reservation.expires_at ?? reservationExpiresAt(reservation.created_at ?? now);
    if (!canCommitReservation(reservation.state, expiresAt, now)) {
      return { ...this.demoStatus(now), allowed: false, reservationId, committed: false, ...(reservation.state === "expired" ? { expired: true } : {}) };
    }
    this.ctx.storage.sql.exec("UPDATE demo_reservations SET state = 'committed' WHERE reservation_id = ? AND state = 'reserved'", reservationId);
    return { ...this.demoStatus(now), reservationId, committed: true };
  }

  async releaseDemo(reservationId: string): Promise<DemoReleaseResult> {
    const now = Date.now();
    this.cleanupReservations(now);
    const reservation = this.ctx.storage.sql.exec<DemoReservationRow>("SELECT reservation_id, window_start, created_at, expires_at, state, source FROM demo_reservations WHERE reservation_id = ?", reservationId).toArray()[0];
    if (!reservation || reservation.state !== "reserved") return { ...this.demoStatus(now), released: false, reservationId, ...(reservation?.state === "expired" ? { expired: true } : {}) };
    if (reservation.source === "reward") {
      const reward = this.rewardAdUsage(now);
      if (reward.window_start === reservation.window_start) this.ctx.storage.sql.exec("UPDATE reward_ad_usage SET bonus_balance = MIN(?, bonus_balance + 1) WHERE slot = 1", REWARD_BONUS_REQUEST_LIMIT);
    } else {
      const usage = this.currentUsage(now, "demo_request_windows", DEMO_REQUEST_WINDOW_MS);
      if (usage?.window_start === reservation.window_start) {
        if (usage.request_count <= 1) this.ctx.storage.sql.exec("DELETE FROM demo_request_windows WHERE slot = 1");
        else this.ctx.storage.sql.exec("UPDATE demo_request_windows SET request_count = ? WHERE slot = 1", usage.request_count - 1);
      }
    }
    this.ctx.storage.sql.exec("UPDATE demo_reservations SET state = 'released' WHERE reservation_id = ? AND state = 'reserved'", reservationId);
    return { ...this.demoStatus(now), released: true, reservationId };
  }

  /** Backwards-compatible alias for older Worker callers. */
  async consumeDemo(): Promise<DemoReservationResult> {
    return this.reserveDemo();
  }

  async getRewardAdStatus(): Promise<RewardAdStatus> {
    const now = Date.now();
    this.cleanupReservations(now);
    return this.rewardAdStatus(now);
  }

  async startRewardAd(): Promise<RewardAdStartResult> {
    const now = Date.now();
    this.cleanupReservations(now);
    const status = this.rewardAdStatus(now);
    const demoUsage = this.currentUsage(now, "demo_request_windows", DEMO_REQUEST_WINDOW_MS);
    const reward = this.rewardAdUsage(now);
    if (!status.enabled) return { ...status, allowed: false, error: "disabled" };
    if (!demoUsage || demoUsage.request_count < DEMO_REQUEST_LIMIT) return { ...status, allowed: false, error: "quota_available" };
    if (reward.bonus_balance > 0) return { ...status, allowed: false, error: "bonus_available" };
    if (reward.ads_completed >= REWARD_AD_DAILY_LIMIT) return { ...status, allowed: false, error: "daily_limit" };
    if (status.nextAdAt && status.nextAdAt > now) return { ...status, allowed: false, error: "cooldown" };
    const active = this.ctx.storage.sql.exec<RewardAdSessionRow>("SELECT session_id, window_start, started_at, eligible_at, expires_at, state, credited FROM reward_ad_sessions WHERE state = 'active' AND expires_at > ? AND window_start = ? LIMIT 1", now, reward.window_start).toArray()[0];
    if (!active) {
      const attempts = this.ctx.storage.sql.exec<{ count: number }>("SELECT COUNT(*) AS count FROM reward_ad_sessions WHERE window_start = ?", reward.window_start).toArray()[0]?.count ?? 0;
      if (attempts >= REWARD_AD_SESSION_ATTEMPT_LIMIT) return { ...status, allowed: false, error: "too_many_attempts" };
    }
    const sessionId = active?.session_id ?? crypto.randomUUID();
    const startedAt = now;
    const eligibleAt = now + REWARD_AD_MIN_VIEW_MS;
    const expiresAt = now + REWARD_AD_SESSION_TTL_MS;
    if (active) {
      this.ctx.storage.sql.exec("UPDATE reward_ad_sessions SET started_at = ?, eligible_at = ?, expires_at = ?, credited = 0 WHERE session_id = ? AND state = 'active'", startedAt, eligibleAt, expiresAt, sessionId);
    } else {
      this.ctx.storage.sql.exec("INSERT INTO reward_ad_sessions (session_id, window_start, started_at, eligible_at, expires_at, state, credited) VALUES (?, ?, ?, ?, ?, 'active', 0)", sessionId, reward.window_start, startedAt, eligibleAt, expiresAt);
    }
    return { ...this.rewardAdStatus(now), allowed: true, sessionId, startedAt, eligibleAt, expiresAt };
  }

  async completeRewardAd(sessionId: string): Promise<RewardAdCompleteResult> {
    const now = Date.now();
    this.cleanupReservations(now);
    const session = this.ctx.storage.sql.exec<RewardAdSessionRow>("SELECT session_id, window_start, started_at, eligible_at, expires_at, state, credited FROM reward_ad_sessions WHERE session_id = ?", sessionId).toArray()[0];
    if (!session) return { ...this.rewardAdStatus(now), completed: false, credited: false, sessionId, error: "session_missing" };
    if (session.state === "completed") return { ...this.rewardAdStatus(now), completed: true, credited: session.credited === 1, sessionId };
    if (session.state === "expired" || session.expires_at <= now) return { ...this.rewardAdStatus(now), completed: false, credited: false, sessionId, error: "session_expired" };
    if (session.state !== "active") return { ...this.rewardAdStatus(now), completed: false, credited: false, sessionId, error: "session_missing" };
    if (session.eligible_at > now) return { ...this.rewardAdStatus(now), completed: false, credited: false, sessionId, error: "too_early" };
    const reward = this.rewardAdUsage(now);
    if (reward.window_start !== session.window_start || reward.ads_completed >= REWARD_AD_DAILY_LIMIT) return { ...this.rewardAdStatus(now), completed: false, credited: false, sessionId, error: "session_expired" };
    const adsCompleted = Math.min(REWARD_AD_DAILY_LIMIT, reward.ads_completed + 1);
    const credited = adsCompleted % REWARD_ADS_PER_REQUEST === 0;
    this.ctx.storage.sql.exec("UPDATE reward_ad_sessions SET state = 'completed', credited = ? WHERE session_id = ? AND state = 'active'", credited ? 1 : 0, sessionId);
    this.ctx.storage.sql.exec("UPDATE reward_ad_usage SET ads_completed = ?, bonus_balance = MIN(?, bonus_balance + ?), last_completed_at = ? WHERE slot = 1", adsCompleted, REWARD_BONUS_REQUEST_LIMIT, credited ? 1 : 0, now);
    return { ...this.rewardAdStatus(now), completed: true, credited, sessionId };
  }

  async cancelRewardAd(sessionId: string): Promise<RewardAdCancelResult> {
    const now = Date.now();
    this.cleanupReservations(now);
    const session = this.ctx.storage.sql.exec<RewardAdSessionRow>("SELECT session_id, window_start, started_at, eligible_at, expires_at, state, credited FROM reward_ad_sessions WHERE session_id = ?", sessionId).toArray()[0];
    const cancelled = session?.state === "active";
    if (cancelled) this.ctx.storage.sql.exec("UPDATE reward_ad_sessions SET state = 'cancelled' WHERE session_id = ? AND state = 'active'", sessionId);
    return { ...this.rewardAdStatus(now), cancelled, sessionId };
  }

  private ttsUsage(now: number): TtsUsageRow {
    const existing = this.ctx.storage.sql.exec<TtsUsageRow>("SELECT window_start, request_count, day_start, character_count FROM tts_usage WHERE slot = 1").toArray()[0];
    const dayStart = existing && now - existing.day_start < 24 * 60 * 60 * 1000 ? existing.day_start : now;
    const windowStart = existing && now - existing.window_start < TTS_REQUEST_WINDOW_MS ? existing.window_start : now;
    const requestCount = dayStart === existing?.day_start && windowStart === existing?.window_start ? existing.request_count : 0;
    const characterCount = dayStart === existing?.day_start ? existing.character_count : 0;
    const usage = { window_start: windowStart, request_count: requestCount, day_start: dayStart, character_count: characterCount };
    this.ctx.storage.sql.exec(
      "INSERT INTO tts_usage (slot, window_start, request_count, day_start, character_count) VALUES (1, ?, ?, ?, ?) ON CONFLICT(slot) DO UPDATE SET window_start = excluded.window_start, request_count = excluded.request_count, day_start = excluded.day_start, character_count = excluded.character_count",
      usage.window_start,
      usage.request_count,
      usage.day_start,
      usage.character_count,
    );
    return usage;
  }

  private ttsStatus(now = Date.now(), privileged = false): TtsReservationResult {
    const usage = this.ttsUsage(now);
    const policy = getTtsPolicy(privileged, this.env);
    return {
      requestLimit: policy.requestLimit,
      requestWindowMs: TTS_REQUEST_WINDOW_MS,
      requestsRemaining: Math.max(0, policy.requestLimit - usage.request_count),
      requestResetAt: usage.window_start + TTS_REQUEST_WINDOW_MS,
      dailyCharacterQuota: policy.dailyCharacterQuota,
      charactersRemaining: Math.max(0, policy.dailyCharacterQuota - usage.character_count),
      dayResetAt: usage.day_start + 24 * 60 * 60 * 1000,
      allowed: true,
    };
  }

  async reserveTts(characters: number, privileged = false): Promise<TtsReservationResult> {
    const now = Date.now();
    this.cleanupReservations(now);
    const policy = getTtsPolicy(privileged, this.env);
    if (!Number.isInteger(characters) || characters < 1 || characters > 2_000) {
      return { ...this.ttsStatus(now, privileged), allowed: false, error: "daily_quota" };
    }
    const usage = this.ttsUsage(now);
    const inFlight = this.ctx.storage.sql.exec<{ reservation_id: string }>("SELECT reservation_id FROM tts_reservations WHERE state = 'reserved' AND COALESCE(expires_at, created_at + ?) > ? AND day_start = ? LIMIT 1", TTS_RESERVATION_TTL_MS, now, usage.day_start).toArray()[0];
    if (inFlight) return { ...this.ttsStatus(now, privileged), allowed: false, error: "parallel_request" };
    if (usage.request_count >= policy.requestLimit) return { ...this.ttsStatus(now, privileged), allowed: false, error: "request_limit" };
    if (usage.character_count + characters > policy.dailyCharacterQuota) return { ...this.ttsStatus(now, privileged), allowed: false, error: "daily_quota" };

    const reservationId = crypto.randomUUID();
    this.ctx.storage.sql.exec("UPDATE tts_usage SET request_count = ?, character_count = ? WHERE slot = 1", usage.request_count + 1, usage.character_count + characters);
    this.ctx.storage.sql.exec("INSERT INTO tts_reservations (reservation_id, day_start, characters, created_at, expires_at, state) VALUES (?, ?, ?, ?, ?, 'reserved')", reservationId, usage.day_start, characters, now, reservationExpiresAt(now));
    return { ...this.ttsStatus(now, privileged), requestsRemaining: Math.max(0, policy.requestLimit - usage.request_count - 1), charactersRemaining: Math.max(0, policy.dailyCharacterQuota - usage.character_count - characters), reservationId };
  }

  async commitTts(reservationId: string): Promise<TtsReservationResult> {
    const now = Date.now();
    this.cleanupReservations(now);
    const reservation = this.ctx.storage.sql.exec<TtsReservationRow>("SELECT reservation_id, day_start, characters, created_at, expires_at, state FROM tts_reservations WHERE reservation_id = ?", reservationId).toArray()[0];
    if (!reservation) return { ...this.ttsStatus(now), allowed: false, reservationId };
    if (reservation.state === "committed") return { ...this.ttsStatus(now), allowed: true, reservationId };
    const expiresAt = reservation.expires_at ?? reservationExpiresAt(reservation.created_at ?? now);
    if (!canCommitReservation(reservation.state, expiresAt, now)) {
      return { ...this.ttsStatus(now), allowed: false, reservationId };
    }
    this.ctx.storage.sql.exec("UPDATE tts_reservations SET state = 'committed' WHERE reservation_id = ? AND state = 'reserved'", reservationId);
    return { ...this.ttsStatus(now), reservationId };
  }

  async releaseTts(reservationId: string): Promise<TtsReservationReleaseResult> {
    const now = Date.now();
    this.cleanupReservations(now);
    const reservation = this.ctx.storage.sql.exec<TtsReservationRow>("SELECT reservation_id, day_start, characters, created_at, expires_at, state FROM tts_reservations WHERE reservation_id = ?", reservationId).toArray()[0];
    if (!reservation || reservation.state !== "reserved") return { ...this.ttsStatus(now), released: false, reservationId };
    const usage = this.ttsUsage(now);
    if (usage.day_start === reservation.day_start) {
      this.ctx.storage.sql.exec("UPDATE tts_usage SET request_count = ?, character_count = ? WHERE slot = 1", Math.max(0, usage.request_count - 1), Math.max(0, usage.character_count - reservation.characters));
    }
    this.ctx.storage.sql.exec("UPDATE tts_reservations SET state = 'released' WHERE reservation_id = ? AND state = 'reserved'", reservationId);
    return { ...this.ttsStatus(now), released: true, reservationId };
  }

  async release(reservationId: string): Promise<ClodexReleaseResult> {
    const now = Date.now();
    this.cleanupReservations(now);
    const reservation = this.ctx.storage.sql.exec<ReservationRow>(
      "SELECT reservation_id, window_start, released FROM clodex_reservations WHERE reservation_id = ?",
      reservationId,
    ).toArray()[0];
    const existing = this.currentUsage(now, "clodex_request_windows", CLODEX_REQUEST_WINDOW_MS);
    if (!reservation || reservation.released || !existing || existing.window_start !== reservation.window_start) {
      return { ...this.status(now), released: false, reservationId };
    }

    if (existing.request_count <= 1) this.ctx.storage.sql.exec("DELETE FROM clodex_request_windows WHERE slot = 1");
    else this.ctx.storage.sql.exec("UPDATE clodex_request_windows SET request_count = ? WHERE slot = 1", existing.request_count - 1);
    this.ctx.storage.sql.exec("UPDATE clodex_reservations SET released = 1 WHERE reservation_id = ?", reservationId);
    return { ...this.status(now), released: true, reservationId };
  }
}
