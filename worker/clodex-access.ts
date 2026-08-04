import { DurableObject, type DurableObjectState } from "cloudflare:workers";

import {
  CLODEX_REQUEST_LIMIT,
  CLODEX_REQUEST_WINDOW_MS,
  type ClodexAccessStatus,
  type ClodexConsumeResult,
  type ClodexRedeemResult,
  type ClodexReleaseResult,
} from "@/lib/clodex-access";

type ClodexAccessEnv = {
  CLODEX_ACCESS_CODE?: string;
};

type UsageRow = {
  window_start: number;
  request_count: number;
};

type AttemptRow = {
  window_start: number;
  attempt_count: number;
};

const REDEMPTION_ATTEMPT_LIMIT = 5;

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;

  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

/**
 * One object is created per signed-in account. Its SQLite state makes both
 * the entitlement and the rate limit durable across Worker isolates.
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
        activated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS request_windows (
        slot INTEGER PRIMARY KEY CHECK (slot = 1),
        window_start INTEGER NOT NULL,
        request_count INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS redemption_attempts (
        slot INTEGER PRIMARY KEY CHECK (slot = 1),
        window_start INTEGER NOT NULL,
        attempt_count INTEGER NOT NULL
      );
    `);
  }

  private isActive() {
    return this.ctx.storage.sql.exec<{ activated_at: number }>("SELECT activated_at FROM access_grants WHERE slot = 1").toArray().length > 0;
  }

  private currentUsage(now: number) {
    const row = this.ctx.storage.sql.exec<UsageRow>("SELECT window_start, request_count FROM request_windows WHERE slot = 1").toArray()[0];
    if (!row || now - row.window_start >= CLODEX_REQUEST_WINDOW_MS) return null;
    return row;
  }

  private status(now = Date.now()): ClodexAccessStatus {
    const usage = this.currentUsage(now);
    return {
      active: this.isActive(),
      limit: CLODEX_REQUEST_LIMIT,
      windowMs: CLODEX_REQUEST_WINDOW_MS,
      remaining: usage ? Math.max(0, CLODEX_REQUEST_LIMIT - usage.request_count) : CLODEX_REQUEST_LIMIT,
      resetAt: usage ? usage.window_start + CLODEX_REQUEST_WINDOW_MS : null,
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

  async getStatus(): Promise<ClodexAccessStatus> {
    return this.status();
  }

  async redeem(code: string): Promise<ClodexRedeemResult> {
    const now = Date.now();
    if (this.isActive()) return { ...this.status(now), redeemed: true };

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
      "INSERT INTO access_grants (slot, activated_at) VALUES (1, ?) ON CONFLICT(slot) DO UPDATE SET activated_at = excluded.activated_at",
      now,
    );
    this.ctx.storage.sql.exec("DELETE FROM redemption_attempts WHERE slot = 1");
    return { ...this.status(now), redeemed: true };
  }

  async consume(): Promise<ClodexConsumeResult> {
    const now = Date.now();
    if (!this.isActive()) return { ...this.status(now), allowed: false, error: "access_required" };

    const existing = this.currentUsage(now);
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
    this.ctx.storage.sql.exec(
      "INSERT INTO request_windows (slot, window_start, request_count) VALUES (1, ?, ?) ON CONFLICT(slot) DO UPDATE SET window_start = excluded.window_start, request_count = excluded.request_count",
      windowStart,
      requestCount,
    );

    return {
      active: true,
      limit: CLODEX_REQUEST_LIMIT,
      windowMs: CLODEX_REQUEST_WINDOW_MS,
      remaining: CLODEX_REQUEST_LIMIT - requestCount,
      resetAt: windowStart + CLODEX_REQUEST_WINDOW_MS,
      allowed: true,
    };
  }

  async release(): Promise<ClodexReleaseResult> {
    const now = Date.now();
    const existing = this.currentUsage(now);
    if (!existing) return { ...this.status(now), released: false };

    if (existing.request_count <= 1) {
      this.ctx.storage.sql.exec("DELETE FROM request_windows WHERE slot = 1");
    } else {
      this.ctx.storage.sql.exec(
        "UPDATE request_windows SET request_count = ? WHERE slot = 1",
        existing.request_count - 1,
      );
    }

    return { ...this.status(now), released: true };
  }
}
