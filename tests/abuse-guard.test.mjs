import assert from "node:assert/strict";
import test from "node:test";
import { guardAccountAiRequest, guardWorkerRequest } from "../lib/abuse-guard.ts";

function limiter(max) {
  const counters = new Map();
  return {
    keys: counters,
    async limit({ key }) {
      const count = (counters.get(key) ?? 0) + 1;
      counters.set(key, count);
      return { success: count <= max };
    },
  };
}

function request(path, method = "GET", ip = "203.0.113.8", cf = true) {
  const value = new Request(`https://tklabs.uk${path}`, { method, headers: { "cf-connecting-ip": ip } });
  if (cf) Object.defineProperty(value, "cf", { value: {} });
  return value;
}

function bindings() {
  return { RATE_LIMIT_SECRET: "test-secret", WORKSPACE_TRAFFIC_LIMIT: limiter(120), WORKSPACE_WRITE_LIMIT: limiter(30), WORKSPACE_AI_LIMIT: limiter(2), ACCOUNT_AI_LIMIT: limiter(2) };
}

test("early gate rejects a rapid model burst before handler with a bounded retry", async () => {
  const env = bindings();
  assert.equal(await guardWorkerRequest(request("/api/demo", "POST"), env, true), null);
  assert.equal(await guardWorkerRequest(request("/api/tts", "POST"), env, true), null);
  const rejected = await guardWorkerRequest(request("/api/demo", "POST"), env, true);
  assert.equal(rejected.status, 429);
  assert.equal(rejected.headers.get("retry-after"), "60");
  assert.equal((await rejected.json()).code, "rate_limited");
  assert.equal(await guardWorkerRequest(request("/api/demo", "POST", "203.0.113.9"), env, true), null);
  assert.equal(env.WORKSPACE_AI_LIMIT.keys.size, 2);
  assert.ok([...env.WORKSPACE_AI_LIMIT.keys.keys()].every((key) => /^ai:[a-f0-9]{64}$/.test(key)));
});

test("write and traffic ceilings also cover cheap endpoints and page refreshes", async () => {
  const env = { ...bindings(), WORKSPACE_TRAFFIC_LIMIT: limiter(4), WORKSPACE_WRITE_LIMIT: limiter(1) };
  assert.equal(await guardWorkerRequest(request("/api/account/workspace-sync", "PUT"), env, true), null);
  assert.equal((await guardWorkerRequest(request("/api/account/workspace-sync", "PUT"), env, true)).status, 429);
  assert.equal(await guardWorkerRequest(request("/playground"), env, true), null);
  assert.equal(await guardWorkerRequest(request("/models"), env, true), null);
  assert.equal((await guardWorkerRequest(request("/models"), env, true)).status, 429);
  assert.equal((await guardWorkerRequest(request("/api/auth/callback/google", "POST"), env, true)).status, 429);
  assert.equal(await guardWorkerRequest(request("/api/ready"), env, true), null);
  assert.equal((await guardWorkerRequest(request("/api/auth/session"), env, true)).status, 429);
  assert.equal(await guardWorkerRequest(request("/images/logo.svg"), env, true), null);
});

test("account ceiling is shared across expensive routes and normalizes email", async () => {
  const env = bindings();
  assert.equal(await guardAccountAiRequest("Tamer@Example.com", env, true), null);
  assert.equal(await guardAccountAiRequest("tamer@example.com", env, true), null);
  const response = await guardAccountAiRequest("tamer@example.com", env, true);
  assert.equal(response.status, 429);
  assert.equal(await guardAccountAiRequest("other@example.com", env, true), null);
  assert.equal(env.ACCOUNT_AI_LIMIT.keys.size, 2);
  assert.ok([...env.ACCOUNT_AI_LIMIT.keys.keys()].every((key) => /^[a-f0-9]{64}$/.test(key)));
});

test("missing identity or binding fails closed in production and local tests remain usable", async () => {
  assert.equal((await guardWorkerRequest(request("/api/demo", "POST", "203.0.113.8", false), bindings(), true)).status, 503);
  assert.equal((await guardWorkerRequest(request("/api/demo", "POST"), { RATE_LIMIT_SECRET: "secret" }, true)).status, 503);
  assert.equal((await guardAccountAiRequest("a@example.com", { RATE_LIMIT_SECRET: "secret" }, true)).status, 503);
  assert.equal(await guardWorkerRequest(request("/api/demo", "POST", "203.0.113.8", false), {}, false), null);
});

test("signed-in demo and speech reject before quota reservation or provider work", async () => {
  let calls = 0;
  globalThis.__tklabsCloudflareEnv = { RATE_LIMIT_SECRET: "test-secret", ACCOUNT_AI_LIMIT: { async limit() { calls++; return { success: false }; } } };
  globalThis.__tklabsAuth = async () => ({ user: { email: "owner@example.test" } });
  try {
    const { prepareDemoRequest } = await import("../app/api/demo/request-context.ts");
    const { handleTtsPost } = await import("../app/api/tts/route.ts");
    const options = { method: "POST", headers: { origin: "https://tklabs.uk", "content-type": "application/json" }, body: JSON.stringify({ prompt: "Hello", text: "Hello" }) };
    const demo = await prepareDemoRequest(new Request("https://tklabs.uk/api/demo", options));
    assert.equal(demo.response.status, 429);
    const speech = await handleTtsPost(new Request("https://tklabs.uk/api/tts", options), globalThis.__tklabsAuth);
    assert.equal(speech.status, 429);
    assert.equal(calls, 2);
  } finally {
    delete globalThis.__tklabsCloudflareEnv;
    delete globalThis.__tklabsAuth;
  }
});
