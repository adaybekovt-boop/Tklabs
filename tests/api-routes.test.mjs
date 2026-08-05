import assert from "node:assert/strict";
import test from "node:test";

const originalFetch = globalThis.fetch;
const originalEnv = { ...process.env };

function makeDemoStub() {
  let sequence = 0;
  return {
    reserved: 0,
    committed: 0,
    released: 0,
    nextAllowed: true,
    reserveDemo() {
      this.reserved += 1;
      if (!this.nextAllowed) return Promise.resolve({ limit: 3, windowMs: 86_400_000, remaining: 0, resetAt: Date.now() + 1_000, allowed: false });
      sequence += 1;
      return Promise.resolve({ limit: 3, windowMs: 86_400_000, remaining: 2, resetAt: Date.now() + 86_400_000, allowed: true, reservationId: `demo-${sequence}` });
    },
    commitDemo(reservationId) {
      this.committed += 1;
      return Promise.resolve({ allowed: true, reservationId, limit: 3, windowMs: 86_400_000, remaining: 2, resetAt: Date.now() + 86_400_000 });
    },
    releaseDemo(reservationId) {
      this.released += 1;
      return Promise.resolve({ released: true, reservationId, limit: 3, windowMs: 86_400_000, remaining: 3, resetAt: Date.now() + 86_400_000 });
    },
  };
}

function request(body, headers = {}) {
  return new Request("https://tklabs.uk/api/demo", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

function setCloudflareEnv(value) {
  const target = globalThis.__tklabsCloudflareEnv ?? {};
  for (const key of Object.keys(target)) delete target[key];
  Object.assign(target, value);
  globalThis.__tklabsCloudflareEnv = target;
}

async function loadDemo(stub) {
  setCloudflareEnv({ CLODEX_ACCESS: { getByName: () => stub } });
  return import(`../app/api/demo/route.ts?api-test=${Math.random()}`);
}

test.afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const key of Object.keys(process.env)) if (!(key in originalEnv)) delete process.env[key];
  Object.assign(process.env, originalEnv);
});

test("POST /api/demo commits a reservation only after a mocked provider succeeds", async () => {
  const stub = makeDemoStub();
  process.env.RATE_LIMIT_SECRET = "api-test-rate-limit-secret";
  process.env.NVIDIA_API_KEY_PRIMARY = "test-provider-key";
  globalThis.fetch = async (input) => {
    if (String(input).includes("integrate.api.nvidia.com")) {
      return new Response(JSON.stringify({ choices: [{ message: { content: "A mocked provider answer." } }] }), { status: 200, headers: { "content-type": "application/json" } });
    }
    return new Response("not found", { status: 404 });
  };
  const { POST } = await loadDemo(stub);
  const response = await POST(request({ prompt: "Explain a safe educational example", locale: "en" }));
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal(payload.meta.actualProvider, "nvidia");
  assert.equal(stub.reserved, 1);
  assert.equal(stub.committed, 1);
  assert.equal(stub.released, 0);
});

test("POST /api/demo releases a reservation on provider failure and labels fallback output", async () => {
  const stub = makeDemoStub();
  process.env.RATE_LIMIT_SECRET = "api-test-rate-limit-secret";
  process.env.NVIDIA_API_KEY_PRIMARY = "test-provider-key";
  globalThis.fetch = async (input) => String(input).includes("integrate.api.nvidia.com")
    ? new Response("upstream failed", { status: 503 })
    : new Response("not found", { status: 404 });
  const { POST } = await loadDemo(stub);
  const response = await POST(request({ prompt: "Give a short status summary", locale: "en" }));
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal(payload.meta.actualProvider, "edge-fallback");
  assert.equal(payload.meta.actualModel, "local-fallback");
  assert.equal(stub.committed, 0);
  assert.equal(stub.released, 1);
});

test("POST /api/demo rejects invalid origin, oversized attachments and exhausted buckets before provider access", async () => {
  const stub = makeDemoStub();
  process.env.RATE_LIMIT_SECRET = "api-test-rate-limit-secret";
  process.env.NVIDIA_API_KEY_PRIMARY = "test-provider-key";
  let providerCalls = 0;
  globalThis.fetch = async (input) => {
    if (String(input).includes("integrate.api.nvidia.com")) providerCalls += 1;
    return new Response(JSON.stringify({ choices: [{ message: { content: "unexpected" } }] }), { status: 200 });
  };
  const { POST } = await loadDemo(stub);
  assert.equal((await POST(request({ prompt: "hello" }, { origin: "https://evil.example" }))).status, 403);
  assert.equal((await POST(request({ prompt: "hello", attachments: [{ name: "big.txt", content: "x".repeat(17_000) }] }))).status, 413);
  stub.nextAllowed = false;
  assert.equal((await POST(request({ prompt: "hello" }))).status, 429);
  assert.equal(providerCalls, 0);
});

test("GET /api/status caches mocked provider health for one minute", async () => {
  process.env.NVIDIA_API_KEY_PRIMARY = "test-provider-key";
  let providerCalls = 0;
  globalThis.fetch = async (input) => {
    if (String(input).includes("integrate.api.nvidia.com")) {
      providerCalls += 1;
      return new Response("ok", { status: 200 });
    }
    return new Response("not found", { status: 404 });
  };
  setCloudflareEnv({});
  const { GET } = await import(`../app/api/status/route.ts?status-test=${Math.random()}`);
  const first = await GET();
  const second = await GET();
  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.equal((await first.json()).source, "live");
  assert.equal((await second.json()).source, "cache");
  assert.equal(providerCalls, 1);
});

test("protected routes fail closed without an authentication session", async () => {
  setCloudflareEnv({});
  const [{ POST: clodexPost }, { GET: accessGet }, { GET: ttsGet }] = await Promise.all([
    import(`../app/api/clodex/route.ts?auth-test=${Math.random()}`),
    import(`../app/api/profile/access/route.ts?auth-test=${Math.random()}`),
    import(`../app/api/tts/route.ts?auth-test=${Math.random()}`),
  ]);
  const clodex = await clodexPost(request({ prompt: "hello" }));
  const access = await accessGet();
  const tts = await ttsGet();
  assert.ok([401, 404, 503].includes(clodex.status));
  assert.ok([401, 503].includes(access.status));
  assert.ok([401, 503].includes(tts.status));
});
