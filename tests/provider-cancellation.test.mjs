import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

globalThis.__tklabsCloudflareEnv = {};
const { acquireProviderLease } = await import("../lib/ai/providers/scheduler.ts");
const { generateWithErmaMesh, streamWithErmaMesh } = await import("../lib/ai/providers/mesh.ts");
const { InferenceScheduler } = await import("../worker/inference-scheduler.ts");
const { ERMA_MODELS } = await import("../lib/models/server.ts");
const { resolveFallback } = await import("../app/api/demo/fallback.ts");
const { POST } = await import("../app/api/demo/route.ts");
const originalEnv = { ...process.env };
const originalFetch = globalThis.fetch;
const input = { prompt: "Say hello", language: "en", model: ERMA_MODELS[0], requestedReasoning: false, effort: "low", allowCode: true, tone: "professional" };

test.afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const key of Object.keys(globalThis.__tklabsCloudflareEnv)) delete globalThis.__tklabsCloudflareEnv[key];
  for (const key of Object.keys(process.env)) if (!(key in originalEnv)) delete process.env[key];
  Object.assign(process.env, originalEnv);
});

for (const streaming of [false, true]) {
  test(`mesh ${streaming ? "stream" : "JSON"}: user cancellation releases capacity without failing provider health`, async () => {
    const controller = new AbortController();
    const outcomes = [];
    globalThis.__tklabsCloudflareEnv.INFERENCE_SCHEDULER = { getByName: () => ({
      acquire: async () => ({ granted: true, lease: { leaseId: "test-lease", lane: "groq", mode: "normal" } }),
      release: async (outcome) => { outcomes.push(outcome); },
    }) };
    process.env.GROQ_API_KEY = "test-cancel-groq";
    globalThis.fetch = async (_url, init) => {
      controller.abort(new DOMException("Browser stopped", "AbortError"));
      throw init.signal.reason;
    };
    const requestInput = { ...input, signal: controller.signal };
    await assert.rejects(streaming ? streamWithErmaMesh(requestInput, () => {}) : generateWithErmaMesh(requestInput), { name: "AbortError" });
    assert.equal(outcomes.length, 1);
    assert.equal(outcomes[0].cancelled, true);
    assert.equal(outcomes[0].leaseId, "test-lease");
  });
}

test("a lease granted after browser cancellation is returned before inference starts", async () => {
  const controller = new AbortController();
  const outcomes = [];
  globalThis.__tklabsCloudflareEnv.INFERENCE_SCHEDULER = { getByName: () => ({
    acquire: async () => { controller.abort(); return { granted: true, lease: { leaseId: "late-lease", lane: "groq", mode: "normal" } }; },
    release: async (outcome) => { outcomes.push(outcome); },
  }) };
  await assert.rejects(acquireProviderLease(["groq"], { ...input, signal: controller.signal }), { name: "AbortError" });
  assert.deepEqual(outcomes, [{ leaseId: "late-lease", ok: false, cancelled: true, latencyMs: 0 }]);
});

test("real scheduler frees a cancelled lease without cooldown but still backs off on provider failure", async () => {
  const database = new DatabaseSync(":memory:");
  const ctx = {
    storage: { sql: { exec(query, ...bindings) { const rows = database.prepare(query).all(...bindings); return { toArray: () => rows }; } } },
    blockConcurrencyWhile: (callback) => callback(),
  };
  try {
    const scheduler = new InferenceScheduler(ctx, {});
    const request = { candidates: ["nvidia"], fairnessKey: "same-user", requestId: "request", estimatedTokens: 100 };
    const first = await scheduler.acquire(request);
    assert.equal(first.granted, true);
    await scheduler.release({ leaseId: first.lease.leaseId, ok: false, cancelled: true, latencyMs: 10 });
    assert.equal(database.prepare("SELECT COUNT(*) AS count FROM inference_lane_state").get().count, 0);
    const second = await scheduler.acquire(request);
    assert.equal(second.granted, true);
    await scheduler.release({ leaseId: second.lease.leaseId, ok: false, status: 503, latencyMs: 10 });
    const third = await scheduler.acquire(request);
    assert.equal(third.granted, false);
  } finally {
    database.close();
  }
});

test("fallback cancellation is propagated rather than converted into an apparent successful local answer", async () => {
  const controller = new AbortController();
  process.env.CLODEX_ENABLED = "true";
  process.env.CLODEX_API_KEY = "test-fallback";
  process.env.CLODEX_MODEL_FAST = "test-fast";
  process.env.CLODEX_MODEL_REASONING = "test-reasoning";
  process.env.CLODEX_MODEL_PRO = "test-pro";
  globalThis.fetch = async (_url, init) => { controller.abort(); throw init.signal.reason; };
  await assert.rejects(resolveFallback({ prompt: "Say hello", language: "en", allowCode: true, requestId: "cancelled-fallback", requestedModel: "Erma", primaryReason: "provider_failure", signal: controller.signal }), { name: "AbortError" });
});

for (const streaming of [false, true]) {
  test(`demo ${streaming ? "SSE" : "JSON"}: cancelling fallback releases the reservation once`, async () => {
    const controller = new AbortController();
    const quota = {
      committed: 0, released: 0,
      async reserveDemo() { return { allowed: true, reservationId: "fallback-quota", resetAt: Date.now() + 86_400_000 }; },
      async commitDemo() { this.committed += 1; },
      async releaseDemo() { this.released += 1; },
    };
    globalThis.__tklabsCloudflareEnv.CLODEX_ACCESS = { getByName: () => quota };
    process.env.RATE_LIMIT_SECRET = "fallback-rate-limit-test";
    process.env.ERMA_PROVIDER_MESH_ENABLED = "false";
    process.env.NVIDIA_API_KEY_PRIMARY = "test-demo-cancellation";
    process.env.CLODEX_ENABLED = "true";
    process.env.CLODEX_API_KEY = "test-fallback";
    process.env.CLODEX_MODEL_FAST = "test-fast";
    process.env.CLODEX_MODEL_REASONING = "test-reasoning";
    process.env.CLODEX_MODEL_PRO = "test-pro";
    globalThis.fetch = async (url, init) => {
      const requestUrl = url instanceof Request ? url.url : String(url);
      if (requestUrl === "https://integrate.api.nvidia.com/v1/chat/completions") return new Response("Unavailable", { status: 503 });
      assert.equal(requestUrl, "https://clodex.xyz/v1/messages");
      controller.abort(new DOMException("Browser stopped fallback", "AbortError"));
      throw init.signal.reason;
    };
    const response = await POST(new Request("https://tklabs.uk/api/demo", {
      method: "POST", signal: controller.signal,
      headers: { "content-type": "application/json", accept: streaming ? "text/event-stream" : "application/json" },
      body: JSON.stringify({ prompt: "Say hello", locale: "en" }),
    }));
    if (streaming) {
      const events = await response.text();
      assert.match(events, /"stopped":true/);
      assert.doesNotMatch(events, /event: delta|event: meta/);
    } else {
      assert.equal(response.status, 499);
      assert.match((await response.json()).error, /cancelled/i);
    }
    assert.equal(quota.committed, 0);
    assert.equal(quota.released, 1);
  });
}
