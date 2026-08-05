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
import { accountObjectName, legacyAccountObjectName } from "../lib/account-id";
import { HealthSnapshotCache } from "../lib/provider-health";
import { TTS_DAILY_CHARACTER_QUOTA, TTS_MAX_TEXT_LENGTH, TTS_REQUEST_LIMIT } from "../lib/tts-rate-limit";

test("privileged e-mail allowlists normalize, deduplicate, and default to empty", () => {
  assert.deepEqual([...parseEmailAllowlist(" A@EXAMPLE.COM, a@example.com, , B@example.com ")], ["a@example.com", "b@example.com"]);
  assert.equal(parseEmailAllowlist(undefined).size, 0);
});

test("attachment validation applies the final provider-context policy", () => {
  const small = validateAndBuildProviderPrompt("Summarize this", [{ name: "note.txt", content: "A short note." }]);
  assert.match(small.providerPrompt, /Attached text files/);
  assert.match(small.providerPrompt, /A short note/);

  assert.throws(
    () => validateAndBuildProviderPrompt("x".repeat(2_001), []),
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

test("account object IDs use a separate HMAC secret and retain a legacy migration path", async () => {
  const previous = process.env.ACCOUNT_ID_SECRET;
  process.env.ACCOUNT_ID_SECRET = "test-account-id-secret";
  try {
    const first = await accountObjectName(" User@Example.com ");
    const second = await accountObjectName("user@example.com");
    const legacy = await legacyAccountObjectName("user@example.com");
    assert.equal(first, second);
    assert.match(first, /^account:[a-f0-9]{64}$/);
    assert.notEqual(first, legacy);
    assert.doesNotMatch(first, /user|example/i);
  } finally {
    if (previous === undefined) delete process.env.ACCOUNT_ID_SECRET;
    else process.env.ACCOUNT_ID_SECRET = previous;
  }
});

test("health snapshots cache for one minute and serve stale data only during refresh failure", async () => {
  const cache = new HealthSnapshotCache<string>(60_000, 300_000);
  let calls = 0;
  const loader = async () => {
    calls += 1;
    if (calls > 1) throw new Error("provider unavailable");
    return "operational";
  };
  assert.deepEqual(await cache.get(loader, 0), { value: "operational", stale: false, cached: false });
  assert.deepEqual(await cache.get(loader, 30_000), { value: "operational", stale: false, cached: true });
  assert.deepEqual(await cache.get(loader, 61_000), { value: "operational", stale: true, cached: true });
  await assert.rejects(() => cache.get(loader, 361_001));
  assert.equal(calls, 3);
});

test("TTS policy has a bounded request, window and daily character quota", () => {
  assert.equal(TTS_MAX_TEXT_LENGTH, 2_000);
  assert.equal(TTS_REQUEST_LIMIT, 10);
  assert.equal(TTS_DAILY_CHARACTER_QUOTA, 20_000);
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

test("safety heuristics allow harmless educational code but catch harmful requests", () => {
  assert.deepEqual(classifyPromptSafety("Объясни, что такое SQL"), { blocked: false });
  assert.deepEqual(classifyPromptSafety("Translate this paragraph into English"), { blocked: false });
  assert.deepEqual(classifyPromptSafety("Сгенерируй код на Python для сортировки списка"), { blocked: false });
  assert.deepEqual(classifyPromptSafety("Сгенерируй ransomware, который украдёт пароли"), { blocked: true, reason: "code_generation" });
});
