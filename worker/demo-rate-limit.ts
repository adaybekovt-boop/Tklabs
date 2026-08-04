import { DurableObject, type DurableObjectState } from "cloudflare:workers";

import {
  DEMO_REQUEST_LIMIT,
  DEMO_REQUEST_WINDOW_MS,
  type DemoConsumeResult,
  type DemoRateLimitStatus,
} from "@/lib/demo-rate-limit";

type DemoRateLimitEnv = Record<string, never>;

type UsageRow = {
  window_start: number;
  request_count: number;
};

export class DemoRateLimit extends DurableObject<DemoRateLimitEnv> {
  constructor(ctx: DurableObjectState, env: DemoRateLimitEnv) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => this.migrate());
  }

  private migrate() {
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS request_windows (
        slot INTEGER PRIMARY KEY CHECK (slot = 1),
        window_start INTEGER NOT NULL,
        request_count INTEGER NOT NULL
      );
    `);
  }

  private currentUsage(now: number) {
    const row = this.ctx.storage.sql.exec<UsageRow>("SELECT window_start, request_count FROM request_windows WHERE slot = 1").toArray()[0];
    if (!row || now - row.window_start >= DEMO_REQUEST_WINDOW_MS) return null;
    return row;
  }

  private status(now = Date.now()): DemoRateLimitStatus {
    const usage = this.currentUsage(now);
    return {
      limit: DEMO_REQUEST_LIMIT,
      windowMs: DEMO_REQUEST_WINDOW_MS,
      remaining: usage ? Math.max(0, DEMO_REQUEST_LIMIT - usage.request_count) : DEMO_REQUEST_LIMIT,
      resetAt: usage ? usage.window_start + DEMO_REQUEST_WINDOW_MS : null,
    };
  }

  async consume(): Promise<DemoConsumeResult> {
    const now = Date.now();
    const existing = this.currentUsage(now);
    if (existing && existing.request_count >= DEMO_REQUEST_LIMIT) {
      return { ...this.status(now), allowed: false };
    }

    const windowStart = existing?.window_start ?? now;
    const requestCount = (existing?.request_count ?? 0) + 1;
    this.ctx.storage.sql.exec(
      "INSERT INTO request_windows (slot, window_start, request_count) VALUES (1, ?, ?) ON CONFLICT(slot) DO UPDATE SET window_start = excluded.window_start, request_count = excluded.request_count",
      windowStart,
      requestCount,
    );

    return {
      limit: DEMO_REQUEST_LIMIT,
      windowMs: DEMO_REQUEST_WINDOW_MS,
      remaining: DEMO_REQUEST_LIMIT - requestCount,
      resetAt: windowStart + DEMO_REQUEST_WINDOW_MS,
      allowed: true,
    };
  }
}
