import assert from "node:assert/strict";
import test from "node:test";

import {
  DurableWebhookInbox, InboxRetryAfterError, INBOX_CAPACITY, INBOX_MAX_ATTEMPTS, INBOX_RECEIPT_TTL_MS,
} from "../telegram-bot/durable-inbox.ts";
import { handleTelegramWebhook } from "../telegram-bot/webhook.ts";

class MemoryStorage {
  data = new Map();
  alarm = null;
  tail = Promise.resolve();
  failCommit = false;
  transaction(callback) {
    const task = this.tail.then(async () => {
      const data = structuredClone(this.data);
      let alarm = this.alarm;
      const txn = {
        get: async (key) => structuredClone(data.get(key)),
        put: async (key, value) => { data.set(key, structuredClone(value)); },
        delete: async (key) => data.delete(key),
        getAlarm: async () => alarm,
        setAlarm: async (at) => { alarm = at; },
      };
      const result = await callback(txn);
      if (this.failCommit) throw new Error("disk unavailable");
      this.data = data;
      this.alarm = alarm;
      return result;
    });
    this.tail = task.catch(() => undefined);
    return task;
  }
}

const update = (id, text = "hello") => ({
  update_id: id,
  message: {
    message_id: id, date: 1_800_000_000,
    from: { id: 42, is_bot: false, first_name: "User" },
    chat: { id: 42, type: "private" }, text,
  },
});
const env = { TELEGRAM_BOT_TOKEN: "test-token", TELEGRAM_WEBHOOK_SECRET: "test-secret", TELEGRAM_ALLOWED_USER_IDS: "42" };
const webhook = (payload, secret = env.TELEGRAM_WEBHOOK_SECRET) => new Request("https://bot.test/telegram/webhook", {
  method: "POST", headers: { "content-type": "application/json", "X-Telegram-Bot-Api-Secret-Token": secret }, body: JSON.stringify(payload),
});

function fixture(overrides = {}) {
  const storage = new MemoryStorage();
  let now = 1_800_000_000_000;
  const generated = [];
  const delivered = [];
  const services = {
    now: () => now,
    generate: async (input) => { generated.push(input.update_id); return [{ chatId: 42, text: `reply-${input.update_id}` }]; },
    deliver: async (reply) => { delivered.push(reply.text); },
    ...overrides,
  };
  const create = () => new DurableWebhookInbox(storage, services);
  return { storage, services, create, generated, delivered, advance: (at) => { now = at; }, now: () => now };
}

test("webhook acknowledges only committed durable work and duplicate updates generate once", async () => {
  const f = fixture();
  const inbox = f.create();
  const [first, duplicate] = await Promise.all([
    handleTelegramWebhook(webhook(update(1)), env, (input) => inbox.enqueue(input)),
    handleTelegramWebhook(webhook(update(1)), env, (input) => inbox.enqueue(input)),
  ]);
  assert.equal(first.status, 200);
  assert.equal(duplicate.status, 200);
  assert.deepEqual(f.storage.data.get("webhook:queue"), [1]);
  assert.ok(f.storage.alarm > f.now());
  assert.equal(f.generated.length, 0, "paid generation must be outside the webhook response");
  await f.create().alarm(); // The accepting isolate no longer exists.
  assert.deepEqual(f.generated, [1]);
  assert.deepEqual(f.delivered, ["reply-1"]);
  assert.deepEqual(await f.create().enqueue(update(1)), { accepted: true, duplicate: true });
  await f.create().alarm();
  assert.deepEqual(f.generated, [1]);
  assert.deepEqual(f.delivered, ["reply-1"]);
  assert.equal(f.storage.data.get("webhook:update:1").update, undefined, "completed receipts must not retain incoming text");
});

test("failed persistence returns 503 without acknowledging or enqueuing a partial update", async () => {
  const f = fixture();
  f.storage.failCommit = true;
  const response = await handleTelegramWebhook(webhook(update(2)), env, (input) => f.create().enqueue(input));
  assert.equal(response.status, 503);
  assert.equal(f.storage.data.size, 0);
  assert.equal(f.storage.alarm, null);
  f.storage.failCommit = false;
  assert.equal((await handleTelegramWebhook(webhook(update(2)), env, (input) => f.create().enqueue(input))).status, 200);
});

test("inbox is bounded and skips unauthorized, malformed, and oversized updates before persistence", async () => {
  const f = fixture();
  const inbox = f.create();
  for (let id = 0; id < INBOX_CAPACITY; id++) assert.equal((await inbox.enqueue(update(id))).accepted, true);
  assert.equal((await handleTelegramWebhook(webhook(update(100)), env, (input) => inbox.enqueue(input))).status, 503);
  assert.equal((await inbox.enqueue(update(0))).duplicate, true, "duplicates still succeed when capacity is exhausted");
  let enqueued = 0;
  const unexpected = async () => { enqueued++; return { accepted: true, duplicate: false }; };
  const stranger = update(200);
  stranger.message.from.id = 99;
  assert.equal((await handleTelegramWebhook(webhook(stranger), env, unexpected)).status, 200);
  assert.equal((await handleTelegramWebhook(webhook(update(201), "wrong-secret"), env, unexpected)).status, 403);
  assert.equal((await handleTelegramWebhook(webhook(null), env, unexpected)).status, 400);
  assert.equal((await handleTelegramWebhook(webhook(update(202, "x".repeat(70_000))), env, unexpected)).status, 413);
  assert.equal(enqueued, 0);
});

test("delivery retry survives isolate restart and resumes unsent chunks without regenerating AI", async () => {
  let failed = false;
  const sent = [];
  const f = fixture({
    generate: async () => [{ chatId: 42, text: "first" }, { chatId: 42, text: "second" }],
    deliver: async (reply) => {
      if (reply.text === "second" && !failed) { failed = true; throw new Error("Telegram unavailable"); }
      sent.push(reply.text);
    },
  });
  let generations = 0;
  const generate = f.services.generate;
  f.services.generate = async (input) => { generations++; return generate(input); };
  await f.create().enqueue(update(3));
  await f.create().alarm();
  assert.deepEqual(sent, ["first"]);
  assert.equal(f.storage.data.get("webhook:update:3").state, "ready");
  assert.equal(f.storage.data.get("webhook:update:3").nextChunk, 1);
  f.advance(f.storage.alarm);
  await f.create().alarm();
  assert.deepEqual(sent, ["first", "second"]);
  assert.equal(generations, 1);
});

test("generation failures back off, preserve queue order, and recover without concurrent processing", async () => {
  let attempts = 0;
  const f = fixture({ generate: async (input) => {
    attempts++;
    if (attempts === 1) throw new Error("provider unavailable");
    return [{ chatId: 42, text: `reply-${input.update_id}` }];
  } });
  await f.create().enqueue(update(4));
  await f.create().alarm();
  const retryAt = f.storage.alarm;
  assert.ok(retryAt >= f.now() + 5_000);
  await f.create().enqueue(update(5));
  assert.equal(f.storage.alarm, retryAt, "new messages must not bypass head backoff");
  await f.create().alarm();
  assert.equal(attempts, 1);
  f.advance(retryAt);
  const resumed = f.create();
  await Promise.all([resumed.alarm(), resumed.alarm()]);
  assert.deepEqual(f.delivered, ["reply-4"]);
  f.advance(f.storage.alarm);
  await f.create().alarm();
  assert.deepEqual(f.delivered, ["reply-4", "reply-5"]);
});

test("exhausted attempts leave a receipt, release capacity, and notify the user through a persisted fallback", async () => {
  let attempts = 0;
  const failedIds = [];
  const f = fixture({
    generate: async () => { attempts++; throw new Error("provider down"); },
    failed: (id) => failedIds.push(id),
    failureReply: () => [{ chatId: 42, text: "temporarily unavailable" }],
  });
  await f.create().enqueue(update(6));
  for (let retry = 0; retry < INBOX_MAX_ATTEMPTS; retry++) {
    await f.create().alarm();
    f.advance(f.storage.alarm);
  }
  assert.equal(attempts, INBOX_MAX_ATTEMPTS);
  assert.deepEqual(failedIds, [6]);
  assert.equal(f.storage.data.get("webhook:update:6").state, "ready");
  await f.create().alarm();
  assert.deepEqual(f.delivered, ["temporarily unavailable"]);
  assert.deepEqual(f.storage.data.get("webhook:queue"), []);
  assert.equal((await f.create().enqueue(update(6))).duplicate, true);
});

test("idle cleanup rearms until every receipt expires", async () => {
  const f = fixture();
  await f.create().enqueue(update(7));
  await f.create().alarm();
  const firstExpiry = f.now() + INBOX_RECEIPT_TTL_MS;
  f.advance(f.now() + 1_000);
  await f.create().enqueue(update(8));
  await f.create().alarm();
  const secondExpiry = f.now() + INBOX_RECEIPT_TTL_MS;
  f.advance(firstExpiry);
  await f.create().alarm();
  assert.equal(f.storage.data.has("webhook:update:7"), false);
  assert.equal(f.storage.data.has("webhook:update:8"), true);
  assert.equal(f.storage.alarm, secondExpiry);
  f.advance(secondExpiry);
  await f.create().alarm();
  assert.equal(f.storage.data.has("webhook:update:8"), false);
});

test("a provider recovering on its last attempt leaves a fresh delivery retry budget", async () => {
  let generationAttempts = 0;
  let deliveryAttempts = 0;
  const f = fixture({
    generate: async () => {
      if (++generationAttempts < INBOX_MAX_ATTEMPTS) throw new Error("provider unavailable");
      return [{ chatId: 42, text: "recovered" }];
    },
    deliver: async () => { if (++deliveryAttempts === 1) throw new Error("Telegram unavailable"); },
  });
  await f.create().enqueue(update(9));
  for (let attempt = 0; attempt < INBOX_MAX_ATTEMPTS; attempt++) {
    await f.create().alarm();
    f.advance(f.storage.alarm);
  }
  assert.equal(f.storage.data.get("webhook:update:9").state, "ready");
  await f.create().alarm();
  assert.equal(generationAttempts, INBOX_MAX_ATTEMPTS);
  assert.equal(deliveryAttempts, 2);
  assert.equal(f.storage.data.get("webhook:update:9").state, "completed");
});

test("Telegram flood waits do not exhaust retries before retry_after elapses", async () => {
  let deliveries = 0;
  const f = fixture({ deliver: async () => {
    if (++deliveries === 1) throw new InboxRetryAfterError("rate limited", 120_000);
  } });
  await f.create().enqueue(update(10));
  await f.create().alarm();
  assert.equal(f.storage.alarm, f.now() + 120_000);
  f.advance(f.now() + 75_000);
  await f.create().alarm();
  assert.equal(deliveries, 1);
  f.advance(f.storage.alarm);
  await f.create().alarm();
  assert.equal(deliveries, 2);
  assert.equal(f.storage.data.get("webhook:update:10").state, "completed");
});
