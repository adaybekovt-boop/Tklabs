import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { buildAnswerDirective } from "../lib/ai/intelligence/answer.ts";
import { routeErmaTask } from "../lib/ai/intelligence/router.ts";
import { verifyErmaEvidence } from "../lib/ai/intelligence/verifier.ts";
import {
  REQUIRED_RUNTIME_SECRETS,
  hasConfiguredWebSearchProvider,
  validateCloudflareSecretNames,
} from "../scripts/check-cloudflare-secrets.mjs";

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

function baselineSecrets() {
  return new Set(REQUIRED_RUNTIME_SECRETS);
}

test("v0.24.1 production preflight requires at least one complete web-search provider", () => {
  const env = { TKLABS_REQUIRE_WEB_SEARCH: "true" };
  const none = baselineSecrets();
  assert.equal(hasConfiguredWebSearchProvider(none), false);
  assert.throws(() => validateCloudflareSecretNames(none, env), /web-search provider secret/i);

  const gemini = baselineSecrets();
  gemini.add("GOOGLE_GEMINI_API_KEY");
  assert.equal(hasConfiguredWebSearchProvider(gemini), true);
  assert.doesNotThrow(() => validateCloudflareSecretNames(gemini, env));

  const brave = baselineSecrets();
  brave.add("BRAVE_SEARCH_API_KEY");
  assert.equal(hasConfiguredWebSearchProvider(brave), true);
  assert.doesNotThrow(() => validateCloudflareSecretNames(brave, env));

  const incompleteCustom = baselineSecrets();
  incompleteCustom.add("GOOGLE_SEARCH_API_KEY");
  assert.equal(hasConfiguredWebSearchProvider(incompleteCustom), false);
  assert.throws(() => validateCloudflareSecretNames(incompleteCustom, env), /web-search provider secret/i);

  incompleteCustom.add("GOOGLE_SEARCH_CX");
  assert.equal(hasConfiguredWebSearchProvider(incompleteCustom), true);
  assert.doesNotThrow(() => validateCloudflareSecretNames(incompleteCustom, env));
});

test("v0.24.1 static fact fallback stays useful when external verification is unavailable", () => {
  const route = routeErmaTask("Какой основной род в Казахстане?");
  assert.equal(route.intent, "fact_lookup");
  assert.equal(route.freshness, "none");
  const verification = verifyErmaEvidence(route, [], []);
  assert.equal(verification.status, "unverified");
  const directive = buildAnswerDirective(route, verification, "ru");
  assert.match(directive, /Do not ask the user to provide sources/i);
  assert.match(directive, /best-effort background/i);
  assert.match(directive, /one focused clarification/i);
});

test("v0.24.1 deployment requires search readiness without mutating Cloudflare secrets", async () => {
  const workflow = await source(".github/workflows/deploy-cloudflare.yml");
  assert.match(workflow, /TKLABS_REQUIRE_WEB_SEARCH: "true"/);
  assert.match(workflow, /npm run cloudflare:check-secrets/);
  assert.match(workflow, /GOOGLE_GROUNDING_MODEL/);
  assert.doesNotMatch(workflow, /wrangler secret put/);
  assert.doesNotMatch(workflow, /--var "GOOGLE_GEMINI_API_KEY:/);
  assert.doesNotMatch(workflow, /--var "BRAVE_SEARCH_API_KEY:/);
});

test("v0.24.1 stops repeating a terminal web-search failure in the next planner round", async () => {
  const planner = await source("lib/ai/providers/nvidia-tools.ts");
  assert.match(planner, /let terminalWebFailure = false/);
  assert.match(planner, /executed\.name === "search_web" && executed\.trace\.status !== "success"/);
  assert.match(planner, /if \(terminalWebFailure\) break/);
});
