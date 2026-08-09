import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  buildGroundedSearchQueries,
  factualRiskScore,
  isKazakhstanContext,
  rankGroundedResults,
  sanitizeSearchQuery,
  sourceAuthorityScore,
} from "../lib/ai/intelligence/grounding.ts";
import { routeErmaTask } from "../lib/ai/intelligence/router.ts";
import { verifyErmaEvidence } from "../lib/ai/intelligence/verifier.ts";
import { selectErmaModel } from "../lib/models/server.ts";

async function source(path) { return readFile(path, "utf8"); }

test("v0.24 exact factual router grounds Kazakhstan entity questions instead of direct chat", () => {
  const seniorZhuz = routeErmaTask("Кто входит в Старший жуз?");
  assert.equal(seniorZhuz.intent, "fact_lookup");
  assert.equal(seniorZhuz.toolClass, "web");
  assert.equal(seniorZhuz.verification, "verify-sources");
  assert.equal(seniorZhuz.shouldCiteSources, true);
  assert.ok(seniorZhuz.maxToolCalls >= 5);
  assert.equal(routeErmaTask("Привет, как дела?").intent, "conversation");
  assert.equal(routeErmaTask("Реши 2+2").intent, "math");
});

test("v0.24 factual risk recognizes exact, authority-sensitive, and Kazakhstan facts", () => {
  assert.ok(factualRiskScore("Кто входит в Старший жуз?") >= 3);
  assert.ok(factualRiskScore("Какая сейчас базовая ставка Национального банка Казахстана?") >= 3);
  assert.equal(factualRiskScore("Придумай три идеи для рассказа"), 0);
  assert.equal(isKazakhstanContext("Ұлы жүз тайпалары"), true);
});

test("v0.24 search minimization removes private tokens and expands Kazakhstan aliases", () => {
  const raw = "Кто входит в Старший жуз? email me@example.com token nvapi-abcdefghijklmnopqrstuvwxyz123456";
  const sanitized = sanitizeSearchQuery(raw);
  assert.doesNotMatch(sanitized, /example\.com/);
  assert.doesNotMatch(sanitized, /nvapi-/);
  const queries = buildGroundedSearchQueries(raw, "ru");
  assert.ok(queries.length >= 2);
  assert.ok(queries.some((query) => /Ұлы жүз/u.test(query)));
  assert.ok(queries.some((query) => /Старший жуз/u.test(query)));
  assert.ok(queries.every((query) => query.length <= 360));
});

test("v0.24 Kazakhstan source authority favors official topic-specific sources", () => {
  const query = "Какая базовая ставка Национального банка Казахстана сейчас?";
  assert.ok(sourceAuthorityScore("https://nationalbank.kz/ru/news/base-rate", query) > sourceAuthorityScore("https://random-blog.example/kz-rate", query));
  const ranked = rankGroundedResults(query, [
    { title: "Blog", url: "https://random-blog.example/kz-rate", description: "base rate Kazakhstan" },
    { title: "National Bank", url: "https://nationalbank.kz/ru/news/base-rate", description: "official base rate" },
  ]);
  assert.equal(new URL(ranked[0].url).hostname, "nationalbank.kz");
});

test("v0.24 exact facts route to Core or stronger while casual chat stays Lite", () => {
  assert.equal(selectErmaModel("erma-auto", "Привет").tier, "light");
  assert.notEqual(selectErmaModel("erma-auto", "Кто входит в Старший жуз?").tier, "light");
});

test("v0.24 fact verification fails closed without evidence and verifies opened sources", () => {
  const route = routeErmaTask("Кто входит в Старший жуз?");
  const missing = verifyErmaEvidence(route, [], []);
  assert.equal(missing.status, "unverified");
  assert.equal(missing.code, "FACT_EVIDENCE_REQUIRED");

  const opened = verifyErmaEvidence(route, [
    { id: "1", name: "open_web_result", status: "success", durationMs: 2, summary: "ok" },
  ], [
    { id: "a", kind: "web", title: "History", href: "https://e-history.kz/kz/history-of-kazakhstan/show/8617", tool: "open_web_result", trust: "untrusted_external_web" },
  ]);
  assert.equal(opened.status, "verified");
  assert.equal(opened.code, "FACT_SOURCE_VERIFIED");
});

test("v0.24 web gateway is Google-first with bounded fallbacks and readable extraction", async () => {
  const gateway = await source("lib/ai/web/gateway.ts");
  const planner = await source("lib/ai/providers/nvidia-tools.ts");
  const grounding = await source("lib/ai/intelligence/grounding.ts");
  const registry = await source("lib/ai/tools/registry.ts");
  const productFacts = await source("lib/product-facts.ts");

  assert.match(gateway, /generativelanguage\.googleapis\.com\/v1beta\/interactions/);
  assert.match(gateway, /tools: \[\{ type: "google_search" \}\]/);
  assert.match(gateway, /GOOGLE_SEARCH_API_KEY/);
  assert.match(gateway, /BRAVE_SEARCH_API_KEY/);
  assert.match(gateway, /buildGroundedSearchQueries/);
  assert.match(gateway, /rankGroundedResults/);
  assert.match(gateway, /<main\\b/);
  assert.match(gateway, /article:published_time/);
  assert.match(planner, /Exact factual lookups must search first/);
  assert.match(planner, /kazakhstanGroundingContext/);
  assert.match(grounding, /KAZAKHSTAN CONTEXT/);
  assert.match(registry, /Google-first grounding gateway/);
  assert.match(productFacts, /fullConversationSentToSearchProvider: false/);
});

test("v0.24 preserves the friend's 10-mode Erma character layer while hardening factual accuracy", async () => {
  const server = await source("lib/models/server.ts");
  assert.match(server, /=== 10\. ТВОРЧЕСКИЙ ===/);
  assert.match(server, /ТОЧНОСТЬ И ФАКТЫ/);
  assert.match(server, /route\.intent === "fact_lookup"/);
});
