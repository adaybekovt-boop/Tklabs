import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { safeMarkdownUrl } from "../lib/safe-markdown-url.ts";

const originalFetch = globalThis.fetch;
const originalWarn = console.warn;
const originalEnv = { ...process.env };
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

function setCloudflareEnv(value) {
  const target = globalThis.__tklabsCloudflareEnv ?? {};
  for (const key of Object.keys(target)) delete target[key];
  Object.assign(target, value);
  globalThis.__tklabsCloudflareEnv = target;
}

function makeDemoStub() {
  return {
    reserved: 0,
    committed: 0,
    released: 0,
    reserveDemo() {
      this.reserved += 1;
      return Promise.resolve({
        allowed: true,
        reservationId: "demo-cancel-1",
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

function makeTtsStub() {
  return {
    reserved: 0,
    committed: 0,
    released: 0,
    getStatus: async () => ({ hasGrant: false, active: false, limit: 5, windowMs: 900_000, remaining: 5, resetAt: null }),
    reserveTts() {
      this.reserved += 1;
      return Promise.resolve({
        allowed: true,
        reservationId: "tts-cancel-1",
        requestLimit: 5,
        requestWindowMs: 900_000,
        requestsRemaining: 4,
        requestResetAt: Date.now() + 900_000,
        dailyCharacterQuota: 10_000,
        charactersRemaining: 9_995,
        dayResetAt: Date.now() + 86_400_000,
      });
    },
    commitTts() {
      this.committed += 1;
      return Promise.resolve({ allowed: true });
    },
    releaseTts() {
      this.released += 1;
      return Promise.resolve({ released: true });
    },
  };
}

function demoStreamRequest() {
  return new Request("https://tklabs.uk/api/demo", {
    method: "POST",
    headers: {
      accept: "text/event-stream, application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify({ prompt: "Give a short safe greeting", locale: "en" }),
  });
}

function speechRequest(signal) {
  return new Request("https://tklabs.uk/api/tts", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text: "hello", locale: "en" }),
    signal,
  });
}

const signedInSession = async () => ({ user: { email: "user@example.com" } });

async function waitForSettlement(stub, timeoutMs = 500) {
  const startedAt = Date.now();
  while (stub.committed === 0 && stub.released === 0) {
    if (Date.now() - startedAt >= timeoutMs) throw new Error("Timed out waiting for reservation settlement.");
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

test.afterEach(() => {
  globalThis.fetch = originalFetch;
  globalThis.__tklabsAuth = undefined;
  console.warn = originalWarn;
  for (const key of Object.keys(process.env)) if (!(key in originalEnv)) delete process.env[key];
  Object.assign(process.env, originalEnv);
});

test("demo cancellation after the first delivered model delta cannot refund quota", async () => {
  const stub = makeDemoStub();
  setCloudflareEnv({ CLODEX_ACCESS: { getByName: () => stub } });
  process.env.RATE_LIMIT_SECRET = "cancel-test-rate-limit-secret";
  process.env.NVIDIA_API_KEY_PRIMARY = "cancel-test-provider-key";

  const encoder = new TextEncoder();
  globalThis.fetch = async (input, init) => {
    if (!String(input).includes("integrate.api.nvidia.com")) return new Response("not found", { status: 404 });
    const upstream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n'));
        const signal = init?.signal;
        const abort = () => controller.error(new DOMException("Aborted", "AbortError"));
        if (signal?.aborted) abort();
        else signal?.addEventListener("abort", abort, { once: true });
      },
    });
    return new Response(upstream, { status: 200, headers: { "content-type": "text/event-stream" } });
  };

  const { POST } = await import(`../app/api/demo/route.ts?cancel-regression=${Math.random()}`);
  const response = await POST(demoStreamRequest());
  assert.equal(response.status, 200);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let output = "";
  while (!output.includes("event: delta")) {
    const chunk = await reader.read();
    assert.equal(chunk.done, false);
    output += decoder.decode(chunk.value, { stream: true });
  }
  await reader.cancel("test_cancel_after_delta");
  await waitForSettlement(stub);

  assert.equal(stub.reserved, 1);
  assert.equal(stub.committed, 1);
  assert.equal(stub.released, 0);
});

test("TTS cancellation after the first delivered audio chunk cannot refund quota", async () => {
  const stub = makeTtsStub();
  setCloudflareEnv({ CLODEX_ACCESS: { getByName: () => stub } });
  process.env.ACCOUNT_ID_SECRET = "tts-cancel-account-secret";
  process.env.ELEVENLABS_API_KEY = "tts-cancel-provider-key";
  process.env.ELEVENLABS_VOICE_ID = "tts-cancel-voice";

  let upstreamCancelled = false;
  globalThis.fetch = async () => new Response(new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array([1, 2, 3]));
    },
    cancel() {
      upstreamCancelled = true;
    },
  }), { status: 200, headers: { "content-type": "audio/mpeg" } });

  const { handleTtsPost } = await import(`../app/api/tts/route.ts?cancel-regression=${Math.random()}`);
  const response = await handleTtsPost(speechRequest(), signedInSession);
  assert.equal(response.status, 200);
  const reader = response.body.getReader();
  const first = await reader.read();
  assert.equal(first.done, false);
  assert.deepEqual([...first.value], [1, 2, 3]);
  await reader.cancel("test_cancel_after_audio");
  await waitForSettlement(stub);

  assert.equal(stub.reserved, 1);
  assert.equal(stub.committed, 1);
  assert.equal(stub.released, 0);
  assert.equal(upstreamCancelled, true);
});

test("signed-in demo rate limits use account identity before shared Cloudflare IP", async () => {
  process.env.RATE_LIMIT_SECRET = "identity-test-secret";
  const { getRateLimitIdentity } = await import(`../lib/rate-limit-identity.ts?identity-regression=${Math.random()}`);
  const request = new Request("https://tklabs.uk/api/demo", { headers: { "cf-connecting-ip": "203.0.113.10" } });
  Object.defineProperty(request, "cf", { value: { colo: "TEST" } });

  const signedIn = await getRateLimitIdentity(request, " User@Example.com ");
  const anonymous = await getRateLimitIdentity(request, null);
  assert.equal(signedIn.identifier, "account:user@example.com");
  assert.equal(anonymous.identifier, "ip:203.0.113.10");
});

test("protocol-relative Markdown links are blocked", () => {
  assert.equal(safeMarkdownUrl("/status"), "/status");
  assert.equal(safeMarkdownUrl("//evil.example/path"), "#blocked-url");
  assert.equal(safeMarkdownUrl("https://tklabs.uk/status"), "https://tklabs.uk/status");
});

test("security hardening removes known preview secrets and unsafe eval while bounding reservation storage", async () => {
  const [authSource, headersSource, workerSource, reportSource] = await Promise.all([
    read("auth.ts"),
    read("lib/security-headers.mjs"),
    read("worker/clodex-access.ts"),
    read("app/api/security/csp-report/route.ts"),
  ]);

  assert.doesNotMatch(authSource, /tklabs-browser-assurance-local-secret-2026/);
  assert.match(authSource, /isLocalPreviewEnabled/);
  assert.match(authSource, /process\.env\.NODE_ENV === "development"/);
  assert.doesNotMatch(headersSource, /unsafe-eval/);
  assert.match(headersSource, /CONTENT_SECURITY_POLICY_REPORT_ONLY[\s\S]*script-src 'self'/);
  assert.match(workerSource, /DELETE FROM clodex_reservations WHERE window_start < \? LIMIT \?/);
  assert.match(workerSource, /async consume\(\)[\s\S]*this\.cleanupReservations\(now\)/);
  assert.match(workerSource, /async release\(reservationId: string\)[\s\S]*this\.cleanupReservations\(now\)/);
  assert.match(reportSource, /CSP_REPORTS_PER_WINDOW = 20/);
  assert.match(reportSource, /MAX_RATE_BUCKETS = 1_024/);
});

test("CSP report logging is capped per client bucket", async () => {
  const { POST } = await import(`../app/api/security/csp-report/route.ts?report-rate=${Math.random()}`);
  let warnings = 0;
  console.warn = () => { warnings += 1; };
  const body = JSON.stringify({ "csp-report": { "document-uri": "https://tklabs.uk", "blocked-uri": "inline", "violated-directive": "script-src" } });

  for (let index = 0; index < 25; index += 1) {
    const response = await POST(new Request("https://tklabs.uk/api/security/csp-report", {
      method: "POST",
      headers: { "content-type": "application/csp-report" },
      body,
    }));
    assert.equal(response.status, 204);
  }
  assert.equal(warnings, 20);
});
