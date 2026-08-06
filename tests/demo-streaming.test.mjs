import assert from "node:assert/strict";
import test from "node:test";

const originalFetch = globalThis.fetch;
const originalEnv = { ...process.env };

function makeDemoStub() {
  return {
    reserved: 0,
    committed: 0,
    released: 0,
    reserveDemo() {
      this.reserved += 1;
      return Promise.resolve({
        allowed: true,
        reservationId: "demo-stream-1",
        limit: 3,
        windowMs: 86_400_000,
        remaining: 2,
        resetAt: Date.now() + 86_400_000,
      });
    },
    commitDemo() {
      this.committed += 1;
      return Promise.resolve({ allowed: true });
    },
    releaseDemo() {
      this.released += 1;
      return Promise.resolve({ released: true });
    },
  };
}

function setCloudflareEnv(value) {
  const target = globalThis.__tklabsCloudflareEnv ?? {};
  for (const key of Object.keys(target)) delete target[key];
  Object.assign(target, value);
  globalThis.__tklabsCloudflareEnv = target;
}

function streamRequest(body) {
  return new Request("https://tklabs.uk/api/demo", {
    method: "POST",
    headers: {
      accept: "text/event-stream, application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

function upstreamSse() {
  return [
    'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
    'data: {"choices":[{"delta":{"content":" from context"}}]}\n\n',
    'data: {"choices":[],"usage":{"prompt_tokens":42,"completion_tokens":3,"total_tokens":45}}\n\n',
    "data: [DONE]\n\n",
  ].join("");
}

test.afterEach(() => {
  globalThis.fetch = originalFetch;
  globalThis.__tklabsAuth = undefined;
  for (const key of Object.keys(process.env)) if (!(key in originalEnv)) delete process.env[key];
  Object.assign(process.env, originalEnv);
});

test("POST /api/demo streams ordered deltas and sends the multi-turn conversation once", async () => {
  const stub = makeDemoStub();
  setCloudflareEnv({ CLODEX_ACCESS: { getByName: () => stub } });
  process.env.RATE_LIMIT_SECRET = "stream-rate-limit-secret";
  process.env.NVIDIA_API_KEY_PRIMARY = "stream-provider-key";

  let upstreamBody;
  globalThis.fetch = async (input, init) => {
    if (!String(input).includes("integrate.api.nvidia.com")) return new Response("not found", { status: 404 });
    upstreamBody = JSON.parse(String(init?.body ?? "{}"));
    return new Response(upstreamSse(), {
      status: 200,
      headers: { "content-type": "text/event-stream" },
    });
  };

  const { POST } = await import(`../app/api/demo/route.ts?stream-test=${Math.random()}`);
  const response = await POST(streamRequest({
    prompt: "Now shorten it",
    locale: "en",
    messages: [
      { role: "user", content: "Draft a release plan" },
      { role: "assistant", content: "Here is the release plan" },
    ],
  }));
  const stream = await response.text();

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /text\/event-stream/);
  assert.match(stream, /event: start/);
  assert.match(stream, /event: delta\ndata: \{"text":"Hello"\}/);
  assert.match(stream, /event: delta\ndata: \{"text":" from context"\}/);
  assert.match(stream, /event: meta/);
  assert.match(stream, /"inputTokens":42/);
  assert.match(stream, /event: done/);

  assert.equal(upstreamBody.stream, true);
  assert.equal(upstreamBody.messages.length, 4);
  assert.equal(upstreamBody.messages[0].role, "system");
  assert.deepEqual(upstreamBody.messages.slice(1), [
    { role: "user", content: "Draft a release plan" },
    { role: "assistant", content: "Here is the release plan" },
    { role: "user", content: "Now shorten it" },
  ]);
  assert.equal(stub.reserved, 1);
  assert.equal(stub.committed, 1);
  assert.equal(stub.released, 0);
});
