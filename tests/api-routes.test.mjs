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

function speechRequest(text, signal) {
  return new Request("https://tklabs.uk/api/tts", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text, locale: "en" }),
    signal,
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

async function loadTts(stub) {
  setCloudflareEnv({ CLODEX_ACCESS: { getByName: () => stub } });
  return import(`../app/api/tts/route.ts?tts-test=${Math.random()}`);
}

const signedInSession = async () => ({ user: { email: "user@example.com" } });

test.afterEach(() => {
  globalThis.fetch = originalFetch;
  globalThis.__tklabsAuth = undefined;
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

test("allowlisted authenticated owner bypasses product demo quota without leaking the allowlist", async () => {
  const stub = makeDemoStub();
  process.env.RATE_LIMIT_SECRET = "api-test-rate-limit-secret";
  process.env.NVIDIA_API_KEY_PRIMARY = "test-provider-key";
  process.env.UNLIMITED_AI_EMAILS = " OWNER@EXAMPLE.TEST, other@example.test ";
  globalThis.__tklabsAuth = async () => ({ user: { email: " owner@example.test " } });
  globalThis.fetch = async (input) => String(input).includes("integrate.api.nvidia.com")
    ? new Response(JSON.stringify({ choices: [{ message: { content: "A privileged answer." } }] }), { status: 200 })
    : new Response("not found", { status: 404 });
  const { POST } = await loadDemo(stub);
  const response = await POST(request({ prompt: "Use the privileged workspace", locale: "en" }));
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal(stub.reserved, 0);
  assert.equal(stub.committed, 0);
  assert.equal(payload.meta.actualProvider, "nvidia");
  assert.doesNotMatch(JSON.stringify(payload), /UNLIMITED_AI_EMAILS|owner@example\.test|other@example\.test/);
});

test("an allowlist never grants unlimited access without an authenticated session", async () => {
  const stub = makeDemoStub();
  process.env.RATE_LIMIT_SECRET = "api-test-rate-limit-secret";
  process.env.NVIDIA_API_KEY_PRIMARY = "test-provider-key";
  process.env.UNLIMITED_AI_EMAILS = "owner@example.test";
  globalThis.__tklabsAuth = async () => null;
  globalThis.fetch = async (input) => String(input).includes("integrate.api.nvidia.com")
    ? new Response(JSON.stringify({ choices: [{ message: { content: "A guest answer." } }] }), { status: 200 })
    : new Response("not found", { status: 404 });
  const { POST } = await loadDemo(stub);
  const response = await POST(request({ prompt: "Use the public demo", locale: "en" }));
  assert.equal(response.status, 200);
  assert.equal(stub.reserved, 1);
  assert.equal(stub.committed, 1);
});

test("POST /api/demo makes an explicit safety decision after NVIDIA returns an unsafe answer", async () => {
  const stub = makeDemoStub();
  process.env.RATE_LIMIT_SECRET = "api-test-rate-limit-secret";
  process.env.NVIDIA_API_KEY_PRIMARY = "test-provider-key";
  globalThis.fetch = async (input) => String(input).includes("integrate.api.nvidia.com")
    ? new Response(JSON.stringify({ choices: [{ message: { content: "Here is a ransomware keylogger." } }] }), { status: 200 })
    : new Response("not found", { status: 404 });
  const { POST } = await loadDemo(stub);
  const response = await POST(request({ prompt: "Explain a safe educational example", locale: "en" }));
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal(payload.meta.actualModel, "safety-policy");
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

test("POST /api/demo commits only after a successful Clodex fallback", async () => {
  const stub = makeDemoStub();
  process.env.RATE_LIMIT_SECRET = "api-test-rate-limit-secret";
  process.env.NVIDIA_API_KEY_PRIMARY = "test-provider-key";
  process.env.CLODEX_ENABLED = "true";
  process.env.CLODEX_API_KEY = "test-clodex-key";
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.includes("integrate.api.nvidia.com")) return new Response("upstream failed", { status: 503 });
    if (url.includes("clodex.xyz/v1/messages")) {
      assert.equal(stub.released, 0, "the reservation remains held until fallback succeeds");
      return new Response(JSON.stringify({ content: [{ type: "text", text: "A fallback answer." }] }), { status: 200, headers: { "content-type": "application/json" } });
    }
    return new Response("not found", { status: 404 });
  };
  const { POST } = await loadDemo(stub);
  const response = await POST(request({ prompt: "Give a short status summary", locale: "en" }));
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal(payload.meta.actualProvider, "clodex");
  assert.equal(stub.committed, 1);
  assert.equal(stub.released, 0);
});

function makeTtsStub(result = "success") {
  return {
    reservedCharacters: 0,
    privileged: false,
    reserved: 0,
    committed: 0,
    released: 0,
    getStatus: async () => ({ hasGrant: false, active: false, limit: 5, windowMs: 900_000, remaining: 5, resetAt: null }),
    reserveTts(characters, privileged) {
      this.reserved += 1;
      this.reservedCharacters = characters;
      this.privileged = privileged;
      if (result === "parallel") return Promise.resolve({ allowed: false, error: "parallel_request", requestLimit: 5, requestWindowMs: 900_000, requestsRemaining: 0, requestResetAt: Date.now() + 1000, dailyCharacterQuota: 10_000, charactersRemaining: 9_000, dayResetAt: Date.now() + 86_400_000 });
      if (result === "quota") return Promise.resolve({ allowed: false, error: "request_limit", requestLimit: 5, requestWindowMs: 900_000, requestsRemaining: 0, requestResetAt: Date.now() + 1000, dailyCharacterQuota: 10_000, charactersRemaining: 9_000, dayResetAt: Date.now() + 86_400_000 });
      if (result === "daily") return Promise.resolve({ allowed: false, error: "daily_quota", requestLimit: 5, requestWindowMs: 900_000, requestsRemaining: 4, requestResetAt: Date.now() + 1000, dailyCharacterQuota: 10_000, charactersRemaining: 0, dayResetAt: Date.now() + 86_400_000 });
      return Promise.resolve({ allowed: true, reservationId: "tts-1", requestLimit: 5, requestWindowMs: 900_000, requestsRemaining: 4, requestResetAt: Date.now() + 900_000, dailyCharacterQuota: 10_000, charactersRemaining: 9_999, dayResetAt: Date.now() + 86_400_000 });
    },
    commitTts() { this.committed += 1; return Promise.resolve({ allowed: true }); },
    releaseTts() { this.released += 1; return Promise.resolve({ released: true }); },
  };
}

test("POST /api/tts uses Unicode code points and commits only after the audio stream completes", async () => {
  const stub = makeTtsStub();
  process.env.ACCOUNT_ID_SECRET = "tts-account-secret";
  process.env.ELEVENLABS_API_KEY = "test-eleven-key";
  process.env.ELEVENLABS_VOICE_ID = "test-voice";
  globalThis.fetch = async () => new Response(new Uint8Array([1, 2, 3]), { status: 200, headers: { "content-type": "audio/mpeg" } });
  const { handleTtsPost } = await loadTts(stub);
  const response = await handleTtsPost(speechRequest("🙂"), signedInSession);
  assert.equal(response.status, 200);
  await response.arrayBuffer();
  assert.equal(stub.reservedCharacters, 1);
  assert.equal(stub.committed, 1);
  assert.equal(stub.released, 0);
});

test("POST /api/tts passes the server-side privileged policy only for an allowlisted account", async () => {
  const stub = makeTtsStub();
  process.env.ACCOUNT_ID_SECRET = "tts-account-secret";
  process.env.ELEVENLABS_API_KEY = "test-eleven-key";
  process.env.ELEVENLABS_VOICE_ID = "test-voice";
  process.env.UNLIMITED_AI_EMAILS = " user@example.com, USER@example.com ";
  globalThis.fetch = async () => new Response(new Uint8Array([1]), { status: 200, headers: { "content-type": "audio/mpeg" } });
  const { handleTtsPost } = await loadTts(stub);
  const response = await handleTtsPost(speechRequest("hello"), signedInSession);
  assert.equal(response.status, 200);
  await response.arrayBuffer();
  assert.equal(stub.privileged, true);
});

test("POST /api/tts releases on provider failure, rejects parallel quota, and skips an already-aborted provider call", async () => {
  const failureStub = makeTtsStub();
  process.env.ACCOUNT_ID_SECRET = "tts-account-secret";
  process.env.ELEVENLABS_API_KEY = "test-eleven-key";
  process.env.ELEVENLABS_VOICE_ID = "test-voice";
  globalThis.fetch = async () => new Response("provider failed", { status: 503 });
  const { handleTtsPost } = await loadTts(failureStub);
  assert.equal((await handleTtsPost(speechRequest("hello"), signedInSession)).status, 502);
  assert.equal(failureStub.released, 1);

  const parallelStub = makeTtsStub("parallel");
  const parallelRoute = await loadTts(parallelStub);
  const parallelResponse = await parallelRoute.handleTtsPost(speechRequest("hello"), signedInSession);
  assert.equal(parallelResponse.status, 409);
  assert.equal(parallelResponse.headers.get("retry-after"), "1");

  const quotaStub = makeTtsStub("quota");
  const quotaRoute = await loadTts(quotaStub);
  const requestQuotaResponse = await quotaRoute.handleTtsPost(speechRequest("hello"), signedInSession);
  assert.equal(requestQuotaResponse.status, 429);
  const requestRetryAfter = Number(requestQuotaResponse.headers.get("retry-after"));
  assert.ok(requestRetryAfter > 0 && requestRetryAfter <= 2);

  const dailyStub = makeTtsStub("daily");
  const dailyRoute = await loadTts(dailyStub);
  const dailyQuotaResponse = await dailyRoute.handleTtsPost(speechRequest("hello"), signedInSession);
  assert.equal(dailyQuotaResponse.status, 429);
  const dailyRetryAfter = Number(dailyQuotaResponse.headers.get("retry-after"));
  assert.ok(dailyRetryAfter > 60 * 60, "daily quota should use the day reset timestamp");

  const abortedStub = makeTtsStub();
  const abortedRoute = await loadTts(abortedStub);
  const controller = new AbortController();
  controller.abort();
  assert.equal((await abortedRoute.handleTtsPost(speechRequest("hello", controller.signal), signedInSession)).status, 499);
  assert.equal(abortedStub.reserved, 0);
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

test("account access prefers a non-empty HMAC object over every legacy grant state", async () => {
  const { accountObjectName, legacyAccountObjectName } = await import("../lib/account-id.ts");
  const { getClodexAccessStatus } = await import(`../lib/account-access.ts?precedence=${Math.random()}`);
  process.env.ACCOUNT_ID_SECRET = "account-test-secret";
  const currentName = await accountObjectName("user@example.com");
  const legacyName = await legacyAccountObjectName("user@example.com");
  const base = { active: false, limit: 5, windowMs: 900_000, remaining: 5, resetAt: null, hasGrant: false };
  const current = { ...base, hasGrant: false };
  const legacy = { ...base, hasGrant: true, active: true };
  setCloudflareEnv({ CLODEX_ACCESS: { getByName: (name) => name === currentName ? { getStatus: async () => current } : { getStatus: async () => legacy } } });
  assert.equal((await getClodexAccessStatus("user@example.com")).active, true, "legacy is used only when current is empty");

  for (const staleCurrent of [
    { ...base, hasGrant: true, active: false, expiresAt: Date.now() - 1 },
    { ...base, hasGrant: true, active: false, revokedAt: Date.now() },
    { ...base, hasGrant: true, active: false, grantVersion: "v1" },
  ]) {
    setCloudflareEnv({ CLODEX_ACCESS: { getByName: (name) => name === currentName ? { getStatus: async () => staleCurrent } : { getStatus: async () => legacy } } });
    const selected = await getClodexAccessStatus("user@example.com");
    assert.equal(selected.hasGrant, true);
    assert.equal(selected.active, false, "legacy active access must not resurrect a stale current grant");
  }
  assert.notEqual(currentName, legacyName);
});

test("GET /api/status caches mocked provider health for one minute", async () => {
  let statusCalls = 0;
  setCloudflareEnv({ HEALTH_STATUS: { getByName: () => ({ getStatus: async () => {
    statusCalls += 1;
    return {
      checkedAt: new Date(0).toISOString(),
      source: statusCalls === 1 ? "live" : "cache",
      stale: false,
      ok: true,
      services: [{ id: "inference", status: "operational", latencyMs: 1 }],
    };
  } }) } });
  const { GET } = await import(`../app/api/status/route.ts?status-test=${Math.random()}`);
  const first = await GET();
  const second = await GET();
  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.equal((await first.json()).source, "live");
  assert.equal((await second.json()).source, "cache");
  assert.equal(statusCalls, 2);
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

test("admin Clodex revoke route is origin-checked and the legacy self-revoke URL is retired", async () => {
  setCloudflareEnv({});
  const [{ POST: adminRevoke, handleAdminClodexRevoke }, { POST: legacyRevoke }] = await Promise.all([
    import(`../app/api/admin/clodex/revoke/route.ts?admin-revoke=${Math.random()}`),
    import(`../app/api/clodex/revoke/route.ts?legacy-revoke=${Math.random()}`),
  ]);
  const invalidOrigin = await adminRevoke(request({ email: "target@example.com" }, { origin: "https://evil.example" }));
  assert.equal(invalidOrigin.status, 403);
  const unauthenticated = await handleAdminClodexRevoke(request({ email: "target@example.com" }), async () => null);
  assert.equal(unauthenticated.status, 401);
  process.env.UNLIMITED_AI_EMAILS = "admin@example.com";
  process.env.ACCOUNT_ID_SECRET = "admin-account-secret";
  process.env.CLODEX_ENABLED = "false";
  const adminStub = {
    getStatus: async () => ({ hasGrant: true, active: true, limit: 5, windowMs: 900_000, remaining: 5, resetAt: null }),
    revoke: async () => ({ revoked: true, active: false, hasGrant: true }),
  };
  setCloudflareEnv({ CLODEX_ACCESS: { getByName: () => adminStub } });
  const revoked = await handleAdminClodexRevoke(request({ email: " Target@Example.com " }), async () => ({ user: { email: "ADMIN@example.com" } }));
  assert.equal(revoked.status, 200);
  const revokedPayload = await revoked.json();
  assert.equal(revokedPayload.revoked, true);
  assert.equal(revokedPayload.active, false);
  assert.equal(revokedPayload.hasGrant, true);
  assert.match(revokedPayload.requestId, /^[0-9a-f-]{36}$/);
  const oversized = await handleAdminClodexRevoke(request({ email: "x".repeat(9_000) }), async () => ({ user: { email: "admin@example.com" } }));
  assert.equal(oversized.status, 413);
  assert.equal((await legacyRevoke(request({}))).status, 410);
});

test("public route handlers keep the Next.js framework signature", async () => {
  const tts = await loadTts(makeTtsStub());
  const ttsGet = await tts.GET(new Request("https://tklabs.uk/api/tts"));
  const ttsPost = await tts.POST(speechRequest("hello"));
  assert.ok([401, 503].includes(ttsGet.status));
  assert.ok([401, 503].includes(ttsPost.status));

  setCloudflareEnv({});
  const admin = await import(`../app/api/admin/clodex/revoke/route.ts?framework-signature=${Math.random()}`);
  const adminPost = await admin.POST(request({ email: "target@example.com" }));
  assert.ok([401, 503].includes(adminPost.status));
});
