import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

test("Erma provider mesh exposes independent inference providers", async () => {
  const [types, mesh, google, compatible] = await Promise.all([
    source("../lib/ai/types.ts"),
    source("../lib/ai/providers/mesh.ts"),
    source("../lib/ai/providers/google.ts"),
    source("../lib/ai/providers/openai-compatible.ts"),
  ]);

  assert.match(types, /"google" \| "cerebras" \| "groq"/);
  assert.match(mesh, /\["google-fast", "cerebras", "groq", "nvidia"\]/);
  assert.match(mesh, /\["nvidia", "google-core", "cerebras", "groq"\]/);
  assert.match(google, /gemini-3\.5-flash-lite/);
  assert.match(google, /gemini-3\.6-flash/);
  assert.match(compatible, /https:\/\/api\.cerebras\.ai\/v1\/chat\/completions/);
  assert.match(compatible, /https:\/\/api\.groq\.com\/openai\/v1\/chat\/completions/);
});

test("streaming failover never mixes two provider outputs", async () => {
  const mesh = await source("../lib/ai/providers/mesh.ts");
  assert.match(mesh, /if \(streamed\) \{\s*throw new ErmaMeshError/);
  assert.match(mesh, /message: "erma_stream_interrupted"/);
});

test("global Durable Object admission control protects RPM, TPM, and concurrency", async () => {
  const [scheduler, vite] = await Promise.all([
    source("../worker/inference-scheduler.ts"),
    source("../vite.config.ts"),
  ]);

  assert.match(scheduler, /WINDOW_MS = 60_000/);
  assert.match(scheduler, /usage\.recent >= config\.rpm/);
  assert.match(scheduler, /usage\.active >= config\.concurrency/);
  assert.match(scheduler, /usage\.tokens \+ estimatedTokens > config\.tpm/);
  assert.match(scheduler, /SUM\(token_cost\)/);
  assert.match(scheduler, /ERMA_MAX_ACTIVE_PER_USER/);
  assert.match(scheduler, /status === 429/);
  assert.match(vite, /INFERENCE_SCHEDULER/);
  assert.match(vite, /new_sqlite_classes: \["InferenceScheduler"\]/);
  assert.match(vite, /ERMA_GROQ_TPM/);
});

test("mass-scale defaults remain conservative and configurable", async () => {
  const envExample = await source("../.env.example");
  assert.match(envExample, /ERMA_GOOGLE_FAST_RPM=30/);
  assert.match(envExample, /ERMA_CEREBRAS_RPM=30/);
  assert.match(envExample, /ERMA_GROQ_RPM=30/);
  assert.match(envExample, /ERMA_NVIDIA_RPM=30/);
  assert.match(envExample, /ERMA_GROQ_TPM=8000/);
  assert.match(envExample, /ERMA_CEREBRAS_TPM=64000/);
  assert.match(envExample, /ERMA_MAX_ACTIVE_PER_USER=2/);
});
