import type { Update } from "grammy/types";

export const INBOX_CAPACITY = 32;
export const INBOX_MAX_ATTEMPTS = 5;
export const INBOX_RECEIPT_LIMIT = 1_024;
export const INBOX_RECEIPT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const QUEUE_KEY = "webhook:queue";
const RECEIPTS_KEY = "webhook:receipts";

export type TelegramReply = { chatId: number; text: string };
export type EnqueueResult = { accepted: boolean; duplicate: boolean };
export class InboxRetryAfterError extends Error {
  constructor(message: string, readonly retryAfterMs: number) { super(message); }
}
type Receipt = { id: number; at: number };
type Job = {
  state: "pending" | "ready" | "completed" | "failed";
  update?: Update;
  outbox?: TelegramReply[];
  nextChunk: number;
  attempts: number;
  nextAttemptAt: number;
};

export type InboxTransaction = {
  get<T>(key: string): Promise<T | undefined>;
  put<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<boolean>;
  getAlarm(): Promise<number | null>;
  setAlarm(time: number): Promise<void>;
};
export type InboxStorage = {
  transaction<T>(callback: (txn: InboxTransaction) => Promise<T>): Promise<T>;
};

type InboxServices = {
  generate(update: Update): Promise<TelegramReply[]>;
  deliver(reply: TelegramReply): Promise<void>;
  now?: () => number;
  failed?: (updateId: number) => void;
  failureReply?: (update: Update) => TelegramReply[];
};

/** HTTP acceptance, queue insertion, and the wake-up alarm share a transaction. */
export class DurableWebhookInbox {
  private processing: Promise<void> | null = null;
  private readonly now: () => number;

  constructor(private readonly storage: InboxStorage, private readonly services: InboxServices) {
    this.now = services.now ?? Date.now;
  }

  async enqueue(update: Update): Promise<EnqueueResult> {
    return this.storage.transaction(async (txn) => {
      const now = this.now();
      await this.pruneReceipts(txn, now);
      const key = this.key(update.update_id);
      const existing = await txn.get<Job>(key);
      if (existing) {
        if ((existing.state === "pending" || existing.state === "ready") && !this.processing && await txn.getAlarm() === null) {
          const queue = await txn.get<number[]>(QUEUE_KEY) ?? [];
          const head = queue.length ? await txn.get<Job>(this.key(queue[0])) : existing;
          await txn.setAlarm(Math.max(now + 1, head?.nextAttemptAt ?? now));
        }
        return { accepted: true, duplicate: true };
      }
      const queue = await txn.get<number[]>(QUEUE_KEY) ?? [];
      if (queue.length >= INBOX_CAPACITY) return { accepted: false, duplicate: false };
      const job: Job = { state: "pending", update, nextChunk: 0, attempts: 0, nextAttemptAt: now };
      await txn.put(key, job);
      await txn.put(QUEUE_KEY, [...queue, update.update_id]);
      // Do not shorten a failing head's backoff when another message arrives.
      // A new head overrides idle cleanup. A duplicate/tail must not cancel
      // an alarm already executing or replace the head's scheduled retry.
      if (!queue.length || (!this.processing && await txn.getAlarm() === null)) {
        const head = queue.length ? await txn.get<Job>(this.key(queue[0])) : job;
        await txn.setAlarm(Math.max(now + 1, head?.nextAttemptAt ?? now));
      }
      return { accepted: true, duplicate: false };
    });
  }

  alarm(): Promise<void> {
    if (this.processing) return this.processing;
    const processing = this.processHead();
    this.processing = processing.finally(() => { this.processing = null; });
    return this.processing;
  }

  private key(updateId: number) { return `webhook:update:${updateId}`; }

  private async pruneReceipts(txn: InboxTransaction, now: number) {
    const receipts = await txn.get<Receipt[]>(RECEIPTS_KEY) ?? [];
    const retained = receipts.filter((receipt) => now - receipt.at < INBOX_RECEIPT_TTL_MS).slice(-INBOX_RECEIPT_LIMIT);
    const keep = new Set(retained.map((receipt) => receipt.id));
    for (const receipt of receipts) if (!keep.has(receipt.id)) await txn.delete(this.key(receipt.id));
    if (retained.length !== receipts.length) await txn.put(RECEIPTS_KEY, retained);
  }

  private async finish(txn: InboxTransaction, id: number, state: "completed" | "failed") {
    const now = this.now();
    // Drop message contents and generated replies as soon as processing ends.
    await txn.put<Job>(this.key(id), { state, nextChunk: 0, attempts: 0, nextAttemptAt: now });
    const receipts = await txn.get<Receipt[]>(RECEIPTS_KEY) ?? [];
    await txn.put(RECEIPTS_KEY, [...receipts, { id, at: now }]);
    await this.pruneReceipts(txn, now);
    const queue = (await txn.get<number[]>(QUEUE_KEY) ?? []).filter((candidate) => candidate !== id);
    await txn.put(QUEUE_KEY, queue);
    if (queue.length) {
      const next = await txn.get<Job>(this.key(queue[0]));
      await txn.setAlarm(Math.max(now + 1, next?.nextAttemptAt ?? now));
    } else {
      // A cleanup alarm bounds retention even when the bot becomes idle.
      const retained = await txn.get<Receipt[]>(RECEIPTS_KEY) ?? [];
      if (retained.length) await txn.setAlarm(retained[0].at + INBOX_RECEIPT_TTL_MS);
    }
  }

  private async exhaust(txn: InboxTransaction, id: number, job: Job) {
    this.services.failed?.(id);
    if (job.state === "pending" && job.update && this.services.failureReply) {
      await txn.put<Job>(this.key(id), {
        state: "ready", outbox: this.services.failureReply(job.update),
        nextChunk: 0, attempts: 0, nextAttemptAt: this.now(),
      });
      await txn.setAlarm(this.now() + 1);
    } else {
      await this.finish(txn, id, "failed");
    }
  }

  private async processHead(): Promise<void> {
    const head = await this.storage.transaction(async (txn) => {
      const now = this.now();
      await this.pruneReceipts(txn, now);
      const queue = await txn.get<number[]>(QUEUE_KEY) ?? [];
      if (!queue.length) {
        const receipts = await txn.get<Receipt[]>(RECEIPTS_KEY) ?? [];
        if (receipts.length) await txn.setAlarm(receipts[0].at + INBOX_RECEIPT_TTL_MS);
        return null;
      }
      const id = queue[0];
      const job = await txn.get<Job>(this.key(id));
      if (!job) throw new Error("telegram_inbox_missing_job");
      if (job.nextAttemptAt > now) {
        await txn.setAlarm(job.nextAttemptAt);
        return null;
      }
      // Record an attempt before external work. Crashes cannot retry forever.
      if (job.attempts >= INBOX_MAX_ATTEMPTS) {
        await this.exhaust(txn, id, job);
        return null;
      }
      job.attempts += 1;
      await txn.put(this.key(id), job);
      return { id, job };
    });
    if (!head) return;
    const { id, job } = head;
    try {
      if (job.state === "pending") {
        if (!job.update) throw new Error("telegram_inbox_missing_update");
        const outbox = await this.services.generate(job.update);
        job.state = "ready";
        job.outbox = outbox;
        // Generation and delivery have independent retry budgets. A provider
        // recovering on its last attempt must not consume delivery retries.
        job.attempts = 1;
        delete job.update;
        // Persist output before sending: delivery retries never regenerate AI.
        await this.storage.transaction((txn) => txn.put(this.key(id), job));
      }
      const outbox = job.outbox ?? [];
      while (job.nextChunk < outbox.length) {
        await this.services.deliver(outbox[job.nextChunk]);
        job.nextChunk += 1;
        await this.storage.transaction((txn) => txn.put(this.key(id), job));
      }
      await this.storage.transaction((txn) => this.finish(txn, id, "completed"));
    } catch (error) {
      await this.storage.transaction(async (txn) => {
        if (job.attempts >= INBOX_MAX_ATTEMPTS) {
          await this.exhaust(txn, id, job);
        } else {
          const backoff = Math.min(5 * 60_000, 5_000 * 2 ** (job.attempts - 1));
          const retryAfter = error instanceof InboxRetryAfterError && Number.isFinite(error.retryAfterMs)
            ? Math.max(0, Math.min(24 * 60 * 60_000, error.retryAfterMs)) : 0;
          job.nextAttemptAt = this.now() + Math.max(backoff, retryAfter);
          await txn.put(this.key(id), job);
          await txn.setAlarm(job.nextAttemptAt);
        }
      });
    }
  }
}
