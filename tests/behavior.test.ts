import assert from "node:assert/strict";
import test from "node:test";

import { createAiResponseMeta, localFallbackResult } from "../lib/ai/response";
import { classifyPromptSafety } from "../lib/ai-safety";
import { validateAndBuildProviderPrompt, PromptValidationError } from "../lib/chat-prompt";
import { getClodexModel } from "../lib/models/clodex-server";
import { PUBLIC_ERMA_MODELS } from "../lib/models/public";
import { ERMA_MODELS } from "../lib/models/server";
import { hasUnlimitedAccess, parseEmailAllowlist, parseUnlimitedEmails } from "../lib/privileged-access";
import { getRateLimitIdentity, hmacSha256Hex } from "../lib/rate-limit-identity";
import { accountObjectName, legacyAccountObjectName } from "../lib/account-id";
import { TTS_DAILY_CHARACTER_QUOTA, TTS_MAX_TEXT_LENGTH, TTS_PRIVILEGED_DAILY_CHARACTER_QUOTA, TTS_PRIVILEGED_REQUEST_LIMIT, TTS_REQUEST_LIMIT, getTtsPolicy } from "../lib/tts-rate-limit";
import { buildD1MigrationsArgs, getMigrationFiles, runD1Migrations, validateMigrationSql } from "../scripts/migrate-d1.mjs";
import { buildSecretListArgs, missingSecretNames, parseSecretNames, readCloudflareSecretNames, safePreflightError, validateCloudflareSecretNames } from "../scripts/check-cloudflare-secrets.mjs";
import { canCommitReservation, isReservationExpired, reservationExpiresAt } from "../lib/reservation-policy";

test("privileged e-mail allowlists normalize, deduplicate, and default to empty", () => {
  assert.deepEqual([...parseEmailAllowlist(" A@EXAMPLE.COM, a@example.com, , B@example.com ")], ["a@example.com", "b@example.com"]);
  assert.equal(parseEmailAllowlist(undefined).size, 0);
  assert.deepEqual([...parseUnlimitedEmails(" Owner@Example.test, owner@example.test, other@example.test ")], ["owner@example.test", "other@example.test"]);
  assert.equal(hasUnlimitedAccess(" OWNER@EXAMPLE.TEST ", "owner@example.test"), true);
  assert.equal(hasUnlimitedAccess(null, "owner@example.test"), false);
  assert.equal(hasUnlimitedAccess(undefined, "owner@example.test"), false);
  assert.equal(hasUnlimitedAccess("other@example.test", "owner@example.test"), false);
  assert.equal(hasUnlimitedAccess("owner@example.test", "@example.test"), false);
  assert.equal(hasUnlimitedAccess("owner@example.test", "owner@example.test, malformed"), false);
  assert.equal(parseUnlimitedEmails("owner@example.test, OWNER@example.test").size, 1);
});

test("Cloudflare secret preflight validates names without returning secret values", () => {
  const names = parseSecretNames(JSON.stringify([
    { name: "AUTH_SECRET", type: "secret_text", value: "must-not-leak" },
    { name: "RATE_LIMIT_SECRET", type: "secret_text" },
  ]));
  assert.deepEqual([...names], ["AUTH_SECRET", "RATE_LIMIT_SECRET"]);
  assert.deepEqual(missingSecretNames(names, { CLODEX_ENABLED: "false" }), ["AUTH_GOOGLE_ID", "AUTH_GOOGLE_SECRET", "ACCOUNT_ID_SECRET", "NVIDIA_API_KEY_PRIMARY"]);
  assert.throws(() => validateCloudflareSecretNames(names, { CLODEX_ENABLED: "true" }), /AUTH_GOOGLE_ID/);
  assert.throws(() => parseSecretNames("not-json"), /malformed JSON/);
  assert.deepEqual(missingSecretNames(new Set([
    "AUTH_SECRET",
    "AUTH_GOOGLE_ID",
    "AUTH_GOOGLE_SECRET",
    "RATE_LIMIT_SECRET",
    "ACCOUNT_ID_SECRET",
    "NVIDIA_API_KEY_PRIMARY",
  ]), { CLODEX_ENABLED: "false" }), []);
  assert.deepEqual(missingSecretNames(new Set([
    "AUTH_SECRET",
    "AUTH_GOOGLE_ID",
    "AUTH_GOOGLE_SECRET",
    "RATE_LIMIT_SECRET",
    "ACCOUNT_ID_SECRET",
    "NVIDIA_API_KEY_PRIMARY",
  ]), { CLODEX_ENABLED: "true" }), ["CLODEX_API_KEY", "CLODEX_ACCESS_CODE"]);
  assert.deepEqual(missingSecretNames(new Set([
    "AUTH_SECRET",
    "AUTH_GOOGLE_ID",
    "AUTH_GOOGLE_SECRET",
    "RATE_LIMIT_SECRET",
    "ACCOUNT_ID_SECRET",
    "NVIDIA_API_KEY_PRIMARY",
    "ELEVENLABS_API_KEY",
  ]), { CLODEX_ENABLED: "false" }), ["ELEVENLABS_VOICE_ID"]);
  assert.doesNotThrow(() => validateCloudflareSecretNames(new Set([
    "AUTH_SECRET",
    "AUTH_GOOGLE_ID",
    "AUTH_GOOGLE_SECRET",
    "RATE_LIMIT_SECRET",
    "ACCOUNT_ID_SECRET",
    "NVIDIA_API_KEY_PRIMARY",
  ]), { CLODEX_ENABLED: "false" }));
  assert.deepEqual(buildSecretListArgs("dist/server/wrangler.json"), ["wrangler", "secret", "list", "--config", "dist/server/wrangler.json", "--format", "json"]);
  const mockedNames = readCloudflareSecretNames({
    config: "dist/server/wrangler.json",
    root: "/repo",
    run: () => JSON.stringify([{ name: "AUTH_SECRET", type: "secret_text", value: "do-not-return" }]),
  });
  assert.deepEqual([...mockedNames], ["AUTH_SECRET"]);
});

test("Cloudflare preflight diagnostics redact token-like values", () => {
  const error = Object.assign(new Error("request failed: Authorization: Bearer super-secret-token-value"), {
    code: "ERR_CLOUDFLARE_API",
    stderr: 'response {"token":"another-secret-value"}',
  });
  const message = safePreflightError(error);
  assert.match(message, /ERR_CLOUDFLARE_API/);
  assert.doesNotMatch(message, /super-secret-token-value|another-secret-value/);
  assert.match(message, /\[redacted\]/);
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

test("D1 migration runner delegates pending selection and atomic ledger writes to Wrangler", () => {
  assert.deepEqual(getMigrationFiles(["0002_add.sql", "0001_init.sql", "README.md"]), ["0001_init.sql", "0002_add.sql"]);
  assert.throws(() => getMigrationFiles(["bad name.sql"]), /Invalid D1 migration filename/);
  validateMigrationSql([{ name: "0001_init.sql", sql: "CREATE TABLE example (id INTEGER PRIMARY KEY);" }]);
  assert.throws(
    () => validateMigrationSql([{ name: "0001_init.sql", sql: "BEGIN; CREATE TABLE example (id INTEGER); COMMIT;" }]),
    /transaction statements/,
  );

  const calls: Array<{ file: string; args: readonly string[]; options: { cwd: string; stdio: string; env: NodeJS.ProcessEnv } }> = [];
  const run = (file: string, args: readonly string[], options: { cwd: string; stdio: "inherit"; env: NodeJS.ProcessEnv }) => {
    calls.push({ file, args, options });
    return Buffer.from("");
  };
  runD1Migrations({ database: "tklabs", config: "dist/server/wrangler.json", root: "/repo", run });
  assert.deepEqual(calls, [{
    file: "npx",
    args: buildD1MigrationsArgs("tklabs", "dist/server/wrangler.json"),
    options: { cwd: "/repo", stdio: "inherit", env: process.env },
  }]);
  assert.ok(calls[0].args.includes("--remote"));
  assert.ok(!calls[0].args.includes("--file"));
  assert.ok(!calls[0].args.includes("--command"));
  runD1Migrations({ database: "tklabs", config: "dist/server/wrangler.json", root: "/repo", run });
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[1].args, calls[0].args);

  const failedCalls: string[] = [];
  assert.throws(
    () => runD1Migrations({
      database: "tklabs",
      config: "dist/server/wrangler.json",
      root: "/repo",
      run: () => {
        failedCalls.push("migration-and-ledger-command");
        throw new Error("migration failed");
      },
    }),
    /migration failed/,
  );
  assert.deepEqual(failedCalls, ["migration-and-ledger-command"]);
});

test("TTS policy has a bounded request, window and daily character quota", () => {
  assert.equal(TTS_MAX_TEXT_LENGTH, 2_000);
  assert.equal(TTS_REQUEST_LIMIT, 5);
  assert.equal(TTS_DAILY_CHARACTER_QUOTA, 10_000);
  assert.equal(TTS_PRIVILEGED_REQUEST_LIMIT, 30);
  assert.equal(TTS_PRIVILEGED_DAILY_CHARACTER_QUOTA, 100_000);
  assert.deepEqual(getTtsPolicy(false, {}), { requestLimit: 5, requestWindowMs: 900_000, dailyCharacterQuota: 10_000 });
  assert.deepEqual(getTtsPolicy(true, {}), { requestLimit: 30, requestWindowMs: 900_000, dailyCharacterQuota: 100_000 });
  assert.deepEqual(getTtsPolicy(false, { TTS_REQUEST_LIMIT: "9", TTS_DAILY_CHARACTER_QUOTA: "900" }), { requestLimit: 9, requestWindowMs: 900_000, dailyCharacterQuota: 900 });
});

test("reservations expire after two minutes and cannot commit after expiry", () => {
  const createdAt = 10_000;
  const expiresAt = reservationExpiresAt(createdAt);
  assert.equal(expiresAt, createdAt + 120_000);
  assert.equal(isReservationExpired("reserved", expiresAt, expiresAt), true);
  assert.equal(canCommitReservation("reserved", expiresAt, expiresAt), false);
  assert.equal(canCommitReservation("reserved", expiresAt, expiresAt - 1), true);
  assert.equal(isReservationExpired("committed", expiresAt, expiresAt + 1), false);
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
