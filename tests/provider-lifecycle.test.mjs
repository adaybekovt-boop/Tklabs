import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  ProviderTimeoutError,
  withProviderResponse,
} from "../lib/ai/provider-http.ts";

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function hangingResponse(signal, onAbort, chunks = []) {
  return new Response(new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(new TextEncoder().encode(chunk));
      signal?.addEventListener("abort", () => {
        onAbort();
        controller.error(signal.reason ?? new DOMException("Aborted", "AbortError"));
      }, { once: true });
    },
  }));
}

test("provider total timeout remains active after response headers arrive", async () => {
  const originalFetch = globalThis.fetch;
  let abortObserved = false;
  globalThis.fetch = async (_input, init = {}) => hangingResponse(init.signal, () => { abortObserved = true; });

  try {
    await assert.rejects(
      withProviderResponse(
        "https://provider.example/stream",
        { method: "POST" },
        async (response) => response.text(),
        { timeoutMs: 30 },
      ),
      (error) => error instanceof ProviderTimeoutError && error.code === "provider_total_timeout",
    );
    assert.equal(abortObserved, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("external cancellation remains linked while a provider body is being consumed", async () => {
  const originalFetch = globalThis.fetch;
  const external = new AbortController();
  let abortObserved = false;
  globalThis.fetch = async (_input, init = {}) => hangingResponse(init.signal, () => { abortObserved = true; });

  try {
    const request = withProviderResponse(
      "https://provider.example/stream",
      { method: "POST", signal: external.signal },
      async (response) => response.text(),
      { timeoutMs: 500 },
    );
    setTimeout(() => external.abort(new DOMException("Client cancelled", "AbortError")), 20);

    await assert.rejects(request, (error) => error instanceof DOMException && error.name === "AbortError");
    assert.equal(abortObserved, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("provider idle timeout is refreshed by chunks and aborts a stalled stream", async () => {
  const originalFetch = globalThis.fetch;
  let abortObserved = false;
  globalThis.fetch = async (_input, init = {}) => {
    let controller;
    const response = new Response(new ReadableStream({
      start(streamController) {
        controller = streamController;
        streamController.enqueue(new TextEncoder().encode("first"));
        init.signal?.addEventListener("abort", () => {
          abortObserved = true;
          streamController.error(init.signal.reason ?? new DOMException("Aborted", "AbortError"));
        }, { once: true });
      },
    }));
    setTimeout(() => controller.enqueue(new TextEncoder().encode("second")), 15);
    return response;
  };

  try {
    await assert.rejects(
      withProviderResponse(
        "https://provider.example/stream",
        { method: "POST" },
        async (response, lifecycle) => {
          assert.ok(response.body);
          const reader = response.body.getReader();
          try {
            while (true) {
              const { done } = await reader.read();
              lifecycle.touch();
              if (done) return;
            }
          } finally {
            reader.releaseLock();
          }
        },
        { timeoutMs: 500, idleTimeoutMs: 35 },
      ),
      (error) => error instanceof ProviderTimeoutError && error.code === "provider_idle_timeout",
    );
    assert.equal(abortObserved, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("provider lifecycle removes external abort listeners after successful body consumption", async () => {
  const originalFetch = globalThis.fetch;
  const external = new AbortController();
  let abortObserved = false;
  globalThis.fetch = async (_input, init = {}) => {
    init.signal?.addEventListener("abort", () => { abortObserved = true; }, { once: true });
    return new Response("ok");
  };

  try {
    const result = await withProviderResponse(
      "https://provider.example/json",
      { method: "POST", signal: external.signal },
      async (response) => response.text(),
      { timeoutMs: 100 },
    );
    assert.equal(result, "ok");
    external.abort();
    await delay(0);
    assert.equal(abortObserved, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("NVIDIA streaming uses bounded accumulation and a rolling safety window", async () => {
  const source = await readFile(new URL("../lib/ai/providers/nvidia.ts", import.meta.url), "utf8");

  assert.match(source, /STREAM_SAFETY_WINDOW_CHARACTERS = 12_000/);
  assert.match(source, /STREAM_ANSWER_LIMIT_CHARACTERS = 96_000/);
  assert.match(source, /const answerChunks: string\[\] = \[\]/);
  assert.match(source, /safetyWindow = `\$\{safetyWindow\}\$\{delta\.content\}`\.slice/);
  assert.doesNotMatch(source, /const candidate = `\$\{answer\}\$\{delta\.content\}`/);
});
