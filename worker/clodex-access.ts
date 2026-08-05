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
  TTS_DAILY_CHARACTER_QUOTA,
  TTS_REQUEST_LIMIT,
  TTS_REQUEST_WINDOW_MS,
  type TtsReservationReleaseResult,
  type TtsReservationResult,
} from "@/lib/tts-rate-limit";

type ClodexAccessEnv = {
  CLODEX_ACCESS_CODE?: string;
  CLODEX_GRANT_TTL_DAYS?: string;
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
  state: "reserved" | "committed" | "released";
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
  state: "reserved" | "committed" | "released";
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
        state TEXT NOT NULL CHECK (state IN ('reserved', 'committed', 'released'))
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
        state TEXT NOT NULL CHECK (state IN ('reserved', 'committed', 'released'))
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
    ]) {
      try {
        this.ctx.storage.sql.exec(statement);
      } catch {
        // Column already exists.
      }
    }
  }

  private grant() {
    return this.ctx.storage.sql.exec<GrantRow>(
      "SELECT activated_at, expires_at, revoked_at, grant_version FROM access_grants WHERE slot = 1",
    ).toArray()[0] ?? null;
  }

  private isActive(now = Date.now()) {
    const grant = this.grant();
    return Boolean(grant && !grant.revoked_at && (grant.expires_at === null || grant.expires_at > now));
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
      crypto.randomUUID(),
    );
    this.ctx.storage.sql.exec("DELETE FROM redemption_attempts WHERE slot = 1");
    return { ...this.status(now), redeemed: true };
  }

  async revoke(): Promise<ClodexRevokeResult> {
    const now = Date.now();
    const grant = this.grant();
    if (!grant || grant.revoked_at || !this.isActive(now)) return { ...this.status(now), revoked: false };
    this.ctx.storage.sql.exec("UPDATE access_grants SET revoked_at = ? WHERE slot = 1", now);
    return { ...this.status(now), revoked: true };
  }

  async consume(): Promise<ClodexConsumeResult> {
    const now = Date.now();
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

  private demoStatus(now = Date.now()): DemoReservationResult {
    const usage = this.currentUsage(now, "demo_request_windows", DEMO_REQUEST_WINDOW_MS);
    return {
      limit: DEMO_REQUEST_LIMIT,
      windowMs: DEMO_REQUEST_WINDOW_MS,
      remaining: usage ? Math.max(0, DEMO_REQUEST_LIMIT - usage.request_count) : DEMO_REQUEST_LIMIT,
      resetAt: usage ? usage.window_start + DEMO_REQUEST_WINDOW_MS : null,
      allowed: true,
    };
  }

  async reserveDemo(): Promise<DemoReservationResult> {
    const now = Date.now();
    const existing = this.currentUsage(now, "demo_request_windows", DEMO_REQUEST_WINDOW_MS);
    if (existing && existing.request_count >= DEMO_REQUEST_LIMIT) {
      return { ...this.demoStatus(now), allowed: false };
    }
    const windowStart = existing?.window_start ?? now;
    const requestCount = (existing?.request_count ?? 0) + 1;
    const reservationId = crypto.randomUUID();
    this.ctx.storage.sql.exec(
      "INSERT INTO demo_request_windows (slot, window_start, request_count) VALUES (1, ?, ?) ON CONFLICT(slot) DO UPDATE SET window_start = excluded.window_start, request_count = excluded.request_count",
      windowStart,
      requestCount,
    );
    this.ctx.storage.sql.exec("INSERT INTO demo_reservations (reservation_id, window_start, state) VALUES (?, ?, 'reserved')", reservationId, windowStart);
    return { ...this.demoStatus(now), remaining: Math.max(0, DEMO_REQUEST_LIMIT - requestCount), resetAt: windowStart + DEMO_REQUEST_WINDOW_MS, reservationId };
  }

  async commitDemo(reservationId: string): Promise<DemoReservationResult> {
    this.ctx.storage.sql.exec("UPDATE demo_reservations SET state = 'committed' WHERE reservation_id = ? AND state = 'reserved'", reservationId);
    return { ...this.demoStatus(), reservationId };
  }

  async releaseDemo(reservationId: string): Promise<DemoReleaseResult> {
    const now = Date.now();
    const reservation = this.ctx.storage.sql.exec<DemoReservationRow>("SELECT reservation_id, window_start, state FROM demo_reservations WHERE reservation_id = ?", reservationId).toArray()[0];
    if (!reservation || reservation.state !== "reserved") return { ...this.demoStatus(now), released: false, reservationId };
    const usage = this.currentUsage(now, "demo_request_windows", DEMO_REQUEST_WINDOW_MS);
    if (usage?.window_start === reservation.window_start) {
      if (usage.request_count <= 1) this.ctx.storage.sql.exec("DELETE FROM demo_request_windows WHERE slot = 1");
      else this.ctx.storage.sql.exec("UPDATE demo_request_windows SET request_count = ? WHERE slot = 1", usage.request_count - 1);
    }
    this.ctx.storage.sql.exec("UPDATE demo_reservations SET state = 'released' WHERE reservation_id = ? AND state = 'reserved'", reservationId);
    return { ...this.demoStatus(now), released: true, reservationId };
  }

  /** Backwards-compatible alias for older Worker callers. */
  async consumeDemo(): Promise<DemoReservationResult> {
    return this.reserveDemo();
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

  private ttsStatus(now = Date.now()): TtsReservationResult {
    const usage = this.ttsUsage(now);
    return {
      requestLimit: TTS_REQUEST_LIMIT,
      requestWindowMs: TTS_REQUEST_WINDOW_MS,
      requestsRemaining: Math.max(0, TTS_REQUEST_LIMIT - usage.request_count),
      requestResetAt: usage.window_start + TTS_REQUEST_WINDOW_MS,
      dailyCharacterQuota: TTS_DAILY_CHARACTER_QUOTA,
      charactersRemaining: Math.max(0, TTS_DAILY_CHARACTER_QUOTA - usage.character_count),
      dayResetAt: usage.day_start + 24 * 60 * 60 * 1000,
      allowed: true,
    };
  }

  async reserveTts(characters: number): Promise<TtsReservationResult> {
    const now = Date.now();
    if (!Number.isInteger(characters) || characters < 1 || characters > 2_000) {
      return { ...this.ttsStatus(now), allowed: false, error: "daily_quota" };
    }
    const usage = this.ttsUsage(now);
    const inFlight = this.ctx.storage.sql.exec<{ reservation_id: string }>("SELECT reservation_id FROM tts_reservations WHERE state = 'reserved' AND day_start = ? LIMIT 1", usage.day_start).toArray()[0];
    if (inFlight) return { ...this.ttsStatus(now), allowed: false, error: "parallel_request" };
    if (usage.request_count >= TTS_REQUEST_LIMIT) return { ...this.ttsStatus(now), allowed: false, error: "request_limit" };
    if (usage.character_count + characters > TTS_DAILY_CHARACTER_QUOTA) return { ...this.ttsStatus(now), allowed: false, error: "daily_quota" };

    const reservationId = crypto.randomUUID();
    this.ctx.storage.sql.exec("UPDATE tts_usage SET request_count = ?, character_count = ? WHERE slot = 1", usage.request_count + 1, usage.character_count + characters);
    this.ctx.storage.sql.exec("INSERT INTO tts_reservations (reservation_id, day_start, characters, state) VALUES (?, ?, ?, 'reserved')", reservationId, usage.day_start, characters);
    return { ...this.ttsStatus(now), requestsRemaining: Math.max(0, TTS_REQUEST_LIMIT - usage.request_count - 1), charactersRemaining: Math.max(0, TTS_DAILY_CHARACTER_QUOTA - usage.character_count - characters), reservationId };
  }

  async commitTts(reservationId: string): Promise<TtsReservationResult> {
    this.ctx.storage.sql.exec("UPDATE tts_reservations SET state = 'committed' WHERE reservation_id = ? AND state = 'reserved'", reservationId);
    return { ...this.ttsStatus(), reservationId };
  }

  async releaseTts(reservationId: string): Promise<TtsReservationReleaseResult> {
    const now = Date.now();
    const reservation = this.ctx.storage.sql.exec<TtsReservationRow>("SELECT reservation_id, day_start, characters, state FROM tts_reservations WHERE reservation_id = ?", reservationId).toArray()[0];
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
