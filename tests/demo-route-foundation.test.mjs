import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  acceptsEventStream,
  normalizeEffort,
  normalizeLanguage,
  normalizeTone,
} from "../app/api/demo/contracts.ts";
import {
  contextualFallbackPrompt,
  providerFailureReason,
  withContextMetadata,
  withToolCalls,
} from "../app/api/demo/fallback.ts";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("demo request contracts normalize untrusted client values", () => {
  assert.equal(normalizeLanguage("en"), "en");
  assert.equal(normalizeLanguage("fr"), "ru");
  assert.equal(normalizeEffort("low"), "low");
  assert.equal(normalizeEffort("high"), "high");
  assert.equal(normalizeEffort("maximum"), "medium");
  assert.equal(normalizeTone("character"), "character");
  assert.equal(normalizeTone("erma"), "erma");
  assert.equal(normalizeTone("unknown"), "professional");
  assert.equal(acceptsEventStream(new Request("https://tklabs.uk/api/demo", {
    headers: { accept: "application/json, text/event-stream" },
  })), true);
  assert.equal(acceptsEventStream(new Request("https://tklabs.uk/api/demo")), false);
});

test("fallback helpers preserve bounded context metadata and tool traces", () => {
  const context = {
    messages: [
      { role: "user", content: "Question" },
      { role: "assistant", content: "Previous answer" },
    ],
    summary: "Earlier context",
    estimatedTokens: 42,
    includedMessageCount: 2,
    attachmentCount: 1,
    contextLimit: 8_192,
    compacted: true,
  };
  const prompt = contextualFallbackPrompt(context, "Verified tool result");
  assert.match(prompt, /Verified tool result/);
  assert.match(prompt, /User:\nQuestion/);
  assert.doesNotMatch(prompt, /Earlier context/);

  const enriched = withContextMetadata({
    answer: "Answer",
    provider: "edge-fallback",
    actualModel: "local-fallback",
  }, context);
  assert.equal(enriched.inputTokens, 42);
  assert.equal(enriched.contextMessageCount, 2);
  assert.equal(enriched.contextAttachmentCount, 1);
  assert.equal(enriched.contextCompacted, true);

  const traced = withToolCalls(enriched, [{
    id: "tool-1",
    name: "docs.search",
    status: "completed",
  }]);
  assert.equal(traced.toolCalls?.length, 1);
  assert.equal(withToolCalls(enriched, []), enriched);
});

test("provider failure classification remains stable across the provider mesh", () => {
  assert.equal(providerFailureReason(new Error("nvidia_not_configured")), "nvidia_not_configured");
  assert.equal(providerFailureReason(new Error("nvidia_output_blocked")), "safety_output_blocked");
  assert.equal(providerFailureReason(new Error("erma_capacity_exhausted")), "provider_capacity_exhausted");
  assert.equal(providerFailureReason(new Error("erma_mesh_exhausted")), "provider_mesh_exhausted");
  assert.equal(providerFailureReason(new Error("network timeout")), "provider_request_failed");
});

test("demo route stays an orchestrator instead of absorbing infrastructure details", async () => {
  const route = await read("app/api/demo/route.ts");
  const contracts = await read("app/api/demo/contracts.ts");
  const fallback = await read("app/api/demo/fallback.ts");
  const quota = await read("app/api/demo/quota.ts");
  const http = await read("app/api/demo/http.ts");

  assert.ok(route.split("\n").length <= 450, "demo route exceeded the 450-line architecture budget");
  assert.doesNotMatch(route, /demo-rate-limit-access|rate-limit-identity/);
  assert.doesNotMatch(route, /providers\/clodex|models\/clodex-server|feature-flags/);
  assert.match(route, /createDemoQuota/);
  assert.match(route, /resolveFallback/);
  assert.match(route, /promptErrorResponse/);

  assert.match(contracts, /normalizeLanguage/);
  assert.match(fallback, /generateWithClodex/);
  assert.match(quota, /reserveDemoRequest/);
  assert.match(http, /contextErrorResponse/);
});