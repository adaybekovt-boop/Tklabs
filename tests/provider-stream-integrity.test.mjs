import assert from "node:assert/strict";
import test from "node:test";

import { ERMA_MODELS } from "../lib/models/server.ts";
import { streamWithGoogle } from "../lib/ai/providers/google.ts";
import { streamWithNvidia } from "../lib/ai/providers/nvidia.ts";
import { streamWithOpenAiCompatible } from "../lib/ai/providers/openai-compatible.ts";
import { withProviderResponse } from "../lib/ai/provider-http.ts";
import { StreamingReasoningFilter } from "../lib/ai/reasoning.ts";

const originalFetch = globalThis.fetch;
const originalEnv = { ...process.env };
const input = { prompt: "Say hello", language: "en", model: ERMA_MODELS[0], requestedReasoning: false, effort: "low", allowCode: true, tone: "professional" };
const sse = (payload) => `data: ${JSON.stringify(payload)}\n\n`;
const openAiChunk = sse({ choices: [{ delta: { content: "Hello" } }] });
const googleChunk = sse({ candidates: [{ content: { parts: [{ text: "Hello" }] } }] });
const providers = [
  { name: "google", run: (callback) => streamWithGoogle("google-fast", input, callback), chunk: googleChunk, finish: sse({ candidates: [{ finishReason: "STOP" }] }) },
  { name: "nvidia", run: (callback) => streamWithNvidia(input, callback), chunk: openAiChunk, finish: "data: [DONE]\n\n" },
  ...["groq", "cerebras"].map((name) => ({ name, run: (callback) => streamWithOpenAiCompatible(name, input, callback), chunk: openAiChunk, finish: "data: [DONE]\n\n" })),
];

test.beforeEach(() => {
  process.env.NVIDIA_API_KEY_PRIMARY = "test-integrity-nvidia";
  process.env.GOOGLE_GEMINI_API_KEY = "test-integrity-google";
  process.env.GROQ_API_KEY = "test-integrity-groq";
  process.env.CEREBRAS_API_KEY = "test-integrity-cerebras";
});
test.afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const key of Object.keys(process.env)) if (!(key in originalEnv)) delete process.env[key];
  Object.assign(process.env, originalEnv);
});

for (const provider of providers) {
  test(`${provider.name}: split inline reasoning never appears in delivered deltas`, async () => {
    const chunks = ["<thi", "nk>", "private internal notes", "</th", "ink>", "Hello"];
    const payloads = chunks.map((content) => sse(provider.name === "google"
      ? { candidates: [{ content: { parts: [{ text: content }] } }] }
      : { choices: [{ delta: { content } }] }));
    globalThis.fetch = async () => new Response(payloads.join("") + provider.finish);
    const deltas = [];
    const result = await provider.run((text) => deltas.push(text));
    assert.equal(deltas.join(""), "Hello");
    assert.equal(result.answer, "Hello");
    assert.equal(result.reasoningUsed, true);
  });

  test(`${provider.name}: an unclosed reasoning-only block is not a successful empty answer`, async () => {
    const content = "<think>private internal notes";
    const payload = provider.name === "google" ? { candidates: [{ content: { parts: [{ text: content }] } }] } : { choices: [{ delta: { content } }] };
    globalThis.fetch = async () => new Response(sse(payload) + provider.finish);
    const deltas = [];
    await assert.rejects(provider.run((text) => deltas.push(text)), new RegExp(`${provider.name}_empty_response`));
    assert.deepEqual(deltas, []);
  });

  test(`${provider.name}: EOF without a terminal event preserves partial text but fails the response`, async () => {
    let providerSignal;
    globalThis.fetch = async (_url, init) => { providerSignal = init.signal; return new Response(provider.chunk); };
    const deltas = [];
    await assert.rejects(provider.run((text) => deltas.push(text)), new RegExp(`${provider.name}_stream_incomplete`));
    assert.equal(deltas.join(""), "Hello");
    assert.equal(providerSignal.aborted, true);
  });

  test(`${provider.name}: fragmented complete SSE returns the full answer`, async () => {
    const bytes = new TextEncoder().encode(provider.chunk + provider.finish);
    globalThis.fetch = async () => new Response(new ReadableStream({ start(controller) {
      for (let offset = 0; offset < bytes.length; offset += 7) controller.enqueue(bytes.slice(offset, offset + 7));
      controller.close();
    } }));
    const deltas = [];
    const result = await provider.run((text) => deltas.push(text));
    assert.equal(result.answer, "Hello");
    assert.equal(deltas.join(""), result.answer);
  });

  test(`${provider.name}: malformed events cannot be silently skipped`, async () => {
    let providerSignal;
    globalThis.fetch = async (_url, init) => { providerSignal = init.signal; return new Response(provider.chunk + "data: {broken}\n\n" + provider.finish); };
    await assert.rejects(provider.run(() => {}), SyntaxError);
    assert.equal(providerSignal.aborted, true);
  });

  test(`${provider.name}: unterminated oversized events stop upstream generation`, async () => {
    let providerSignal;
    globalThis.fetch = async (_url, init) => {
      providerSignal = init.signal;
      return new Response(new ReadableStream({ start(controller) {
        controller.enqueue(new TextEncoder().encode(`data: ${"x".repeat(1_048_577)}`));
        init.signal.addEventListener("abort", () => controller.error(init.signal.reason), { once: true });
      } }));
    };
    await assert.rejects(provider.run(() => {}), new RegExp(`${provider.name}_stream_event_too_large`));
    assert.equal(providerSignal.aborted, true);
  });
}

test("reasoning filter handles every boundary and preserves ordinary code/HTML", () => {
  const source = "Before<thinking data-mode='private'>hidden words</thinking>After <div>safe</div> 2 < 3";
  for (let boundary = 0; boundary <= source.length; boundary += 1) {
    const filter = new StreamingReasoningFilter();
    const result = filter.push(source.slice(0, boundary)) + filter.push(source.slice(boundary)) + filter.finish();
    assert.equal(result, "Before\nAfter <div>safe</div> 2 < 3", `split at ${boundary}`);
  }
  const characterFilter = new StreamingReasoningFilter();
  assert.equal([...source].map((char) => characterFilter.push(char)).join("") + characterFilter.finish(), "Before\nAfter <div>safe</div> 2 < 3");
});

test("Google safety finish metadata blocks content before sending its delta", async () => {
  globalThis.fetch = async () => new Response(sse({ candidates: [{ content: { parts: [{ text: "Blocked text" }] }, finishReason: "SAFETY" }] }));
  const deltas = [];
  await assert.rejects(streamWithGoogle("google-fast", input, (text) => deltas.push(text)), /google_output_blocked/);
  assert.deepEqual(deltas, []);
});

test("consumer failures abort a live upstream response without masking the original error", async () => {
  let providerSignal;
  globalThis.fetch = async (_url, init) => {
    providerSignal = init.signal;
    return new Response(new ReadableStream({ start(controller) {
      init.signal.addEventListener("abort", () => controller.error(init.signal.reason), { once: true });
    } }));
  };
  const expected = new Error("validation failed");
  await assert.rejects(withProviderResponse("https://provider.example", {}, async () => { throw expected; }), (error) => error === expected);
  assert.equal(providerSignal.aborted, true);
});

test("an already cancelled request never starts provider fetch", async () => {
  const controller = new AbortController();
  controller.abort();
  globalThis.fetch = async () => { assert.fail("cancelled request reached provider"); };
  await assert.rejects(withProviderResponse("https://provider.example", { signal: controller.signal }, (response) => response.text()), { name: "AbortError" });
});
