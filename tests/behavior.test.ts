import assert from "node:assert/strict";
import test from "node:test";

import { createAiResponseMeta, localFallbackResult } from "../lib/ai/response";
import { classifyPromptSafety } from "../lib/ai-safety";
import { validateAndBuildProviderPrompt, PromptValidationError } from "../lib/chat-prompt";
import { getClodexModel } from "../lib/models/clodex-server";
import { PUBLIC_ERMA_MODELS } from "../lib/models/public";
import { ERMA_MODELS } from "../lib/models/server";
import { parseEmailAllowlist } from "../lib/privileged-access";
import { getRateLimitIdentity, hmacSha256Hex } from "../lib/rate-limit-identity";

test("privileged e-mail allowlists normalize, deduplicate, and default to empty", () => {
  assert.deepEqual([...parseEmailAllowlist(" A@EXAMPLE.COM, a@example.com, , B@example.com ")], ["a@example.com", "b@example.com"]);
  assert.equal(parseEmailAllowlist(undefined).size, 0);
});

test("attachment validation applies the final provider-context policy", () => {
  const small = validateAndBuildProviderPrompt("Summarize this", [{ name: "note.txt", content: "A short note." }]);
  assert.match(small.providerPrompt, /Attached text files/);
  assert.match(small.providerPrompt, /A short note/);

  assert.throws(
    () => validateAndBuildProviderPrompt("x".repeat(181), []),
    (error: unknown) => error instanceof PromptValidationError && error.code === "invalid_prompt" && error.status === 400,
  );
  assert.throws(
    () => validateAndBuildProviderPrompt("ok", [{ name: "large.txt", content: "x".repeat(17_000) }]),
    (error: unknown) => error instanceof PromptValidationError && error.code === "attachment_too_large" && error.status === 413,
  );
  assert.throws(
    () => validateAndBuildProviderPrompt("ok", [1, 2, 3, 4]),
    (error: unknown) => error instanceof PromptValidationError && error.code === "too_many_attachments" && error.status === 400,
  );
  assert.throws(
    () => validateAndBuildProviderPrompt("ok", [
      { name: "a.txt", content: "a".repeat(3_000) },
      { name: "b.txt", content: "b".repeat(3_000) },
      { name: "c.txt", content: "c".repeat(3_000) },
    ]),
    (error: unknown) => error instanceof PromptValidationError && error.code === "attachments_too_large" && error.status === 413,
  );
});

test("HMAC rate-limit identifiers are stable, keyed, and do not expose the source IP", async () => {
  const ip = "ip:203.0.113.44";
  const first = await hmacSha256Hex(ip, "test-rate-limit-secret");
  const second = await hmacSha256Hex(ip, "test-rate-limit-secret");
  const differentKey = await hmacSha256Hex(ip, "another-secret");
  assert.equal(first, second);
  assert.notEqual(first, differentKey);
  assert.doesNotMatch(first, /203\.0\.113\.44/);
});

test("signed fallback cookie gives anonymous requests a stable bucket", async () => {
  const previous = process.env.RATE_LIMIT_SECRET;
  process.env.RATE_LIMIT_SECRET = "test-rate-limit-secret";
  try {
    const first = await getRateLimitIdentity(new Request("https://tklabs.uk/api/demo"));
    assert.ok(first.setCookie);
    assert.match(first.setCookie ?? "", /HttpOnly/);
    const cookie = first.setCookie?.split(";", 1)[0] ?? "";
    const second = await getRateLimitIdentity(new Request("https://tklabs.uk/api/demo", { headers: { cookie } }));
    assert.equal(first.identifier, second.identifier);
  } finally {
    if (previous === undefined) delete process.env.RATE_LIMIT_SECRET;
    else process.env.RATE_LIMIT_SECRET = previous;
  }
});

test("public and server model catalogs are separated and capabilities stay honest", () => {
  assert.equal(PUBLIC_ERMA_MODELS.length, 3);
  assert.equal(ERMA_MODELS.length, 3);
  assert.ok(ERMA_MODELS.every((model) => model.nvidiaModel));
  assert.ok(PUBLIC_ERMA_MODELS.every((model) => !("nvidiaModel" in model) && model.tools === false && model.vision === false));
  assert.deepEqual(getClodexModel("clodex:pro"), { key: "clodex:pro", name: "Clodex Pro", providerModel: "deepseek-v4-pro" });
});

test("fallback metadata identifies the actual local mode", () => {
  const result = localFallbackResult("en", "nvidia_request_failed");
  const meta = createAiResponseMeta(result, "Erma Pro", "request-1", 1_000, 200, 1_250);
  assert.equal(meta.actualProvider, "edge-fallback");
  assert.equal(meta.actualModel, "local-fallback");
  assert.equal(meta.requestedModel, "Erma Pro");
  assert.equal(meta.fallbackReason, "nvidia_request_failed");
  assert.equal(meta.latencyMs, 250);
});

test("safety heuristics do not block ordinary explanations but still catch code generation", () => {
  assert.deepEqual(classifyPromptSafety("Объясни, что такое SQL"), { blocked: false });
  assert.deepEqual(classifyPromptSafety("Translate this paragraph into English"), { blocked: false });
  assert.deepEqual(classifyPromptSafety("Сгенерируй код на Python для сортировки списка"), { blocked: true, reason: "code_generation" });
});
