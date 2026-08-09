import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { buildAnswerDirective } from "../lib/ai/intelligence/answer.ts";
import { routeErmaTask } from "../lib/ai/intelligence/router.ts";
import { isContextDependentGroundingTurn } from "../lib/ai/tools/route-tools.ts";
import { getGoogleDirectGrounding } from "../lib/ai/web/google-direct.ts";

async function source(path) { return readFile(path, "utf8"); }

function googlePayload() {
  return {
    status: "completed",
    steps: [
      { type: "google_search_call", arguments: { queries: ["самый многочисленный казахский род"] } },
      { type: "google_search_result", result: [{ search_suggestions: "<div class=\"google-search\">Google Search</div>" }] },
      {
        type: "model_output",
        content: [{
          type: "text",
          text: "Самым многочисленным казахским родом часто называют аргын.",
          annotations: [{
            type: "url_citation",
            url: "https://example.com/source",
            title: "Example source",
            start_index: 0,
            end_index: 57,
          }],
        }],
      },
    ],
  };
}

function saveGoogleEnv() {
  return {
    key: process.env.GOOGLE_GEMINI_API_KEY,
    direct: process.env.GOOGLE_DIRECT_GROUNDING_MODEL,
    retrieval: process.env.GOOGLE_GROUNDING_MODEL,
  };
}

function restoreGoogleEnv(previous) {
  for (const [name, value] of [
    ["GOOGLE_GEMINI_API_KEY", previous.key],
    ["GOOGLE_DIRECT_GROUNDING_MODEL", previous.direct],
    ["GOOGLE_GROUNDING_MODEL", previous.retrieval],
  ]) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
}

test("v0.24.2 sends the minimized user query directly to Gemini Google Search and preserves its answer", async () => {
  const previous = saveGoogleEnv();
  const previousFetch = globalThis.fetch;
  process.env.GOOGLE_GEMINI_API_KEY = "test-google-key";
  delete process.env.GOOGLE_DIRECT_GROUNDING_MODEL;
  delete process.env.GOOGLE_GROUNDING_MODEL;
  let requestBody;
  globalThis.fetch = async (_url, init) => {
    requestBody = JSON.parse(String(init?.body ?? "{}"));
    return new Response(JSON.stringify(googlePayload()), { status: 200, headers: { "content-type": "application/json" } });
  };

  try {
    const result = await getGoogleDirectGrounding("Самый многочисленный казахский род?", new AbortController().signal);
    assert.equal(requestBody.input, "Самый многочисленный казахский род?");
    assert.equal(requestBody.model, "gemini-3.6-flash");
    assert.equal(requestBody.store, false);
    assert.deepEqual(requestBody.tools, [{ type: "google_search" }]);
    assert.equal(result.answer, "Самым многочисленным казахским родом часто называют аргын.");
    assert.equal(result.model, "gemini-3.6-flash");
    assert.equal(result.grounding.directPassThrough, true);
    assert.equal(result.grounding.searchSuggestionsHtml, "<div class=\"google-search\">Google Search</div>");
    assert.equal(result.grounding.citations[0].url, "https://example.com/source");
    assert.deepEqual(result.grounding.searchQueries, ["самый многочисленный казахский род"]);
  } finally {
    globalThis.fetch = previousFetch;
    restoreGoogleEnv(previous);
  }
});

test("v0.24.2 retries only model-compatibility errors on the cheaper grounding model", async () => {
  const previous = saveGoogleEnv();
  const previousFetch = globalThis.fetch;
  process.env.GOOGLE_GEMINI_API_KEY = "test-google-key";
  process.env.GOOGLE_DIRECT_GROUNDING_MODEL = "gemini-3.6-flash";
  process.env.GOOGLE_GROUNDING_MODEL = "gemini-3.5-flash-lite";
  const models = [];
  globalThis.fetch = async (_url, init) => {
    const body = JSON.parse(String(init?.body ?? "{}"));
    models.push(body.model);
    if (models.length === 1) return new Response("not available", { status: 404 });
    return new Response(JSON.stringify(googlePayload()), { status: 200, headers: { "content-type": "application/json" } });
  };

  try {
    const result = await getGoogleDirectGrounding("Кто президент Казахстана?");
    assert.deepEqual(models, ["gemini-3.6-flash", "gemini-3.5-flash-lite"]);
    assert.equal(result.model, "gemini-3.5-flash-lite");
  } finally {
    globalThis.fetch = previousFetch;
    restoreGoogleEnv(previous);
  }
});

test("v0.24.2 does not multiply provider quota failures", async () => {
  const previous = saveGoogleEnv();
  const previousFetch = globalThis.fetch;
  process.env.GOOGLE_GEMINI_API_KEY = "test-google-key";
  process.env.GOOGLE_DIRECT_GROUNDING_MODEL = "gemini-3.6-flash";
  process.env.GOOGLE_GROUNDING_MODEL = "gemini-3.5-flash-lite";
  let calls = 0;
  globalThis.fetch = async () => { calls += 1; return new Response("quota", { status: 429 }); };

  try {
    await assert.rejects(() => getGoogleDirectGrounding("Последние новости Казахстана"), /google_grounding_http_429/);
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = previousFetch;
    restoreGoogleEnv(previous);
  }
});

test("v0.24.2 does not direct-pass an answer when Google Search attribution is incomplete", async () => {
  const previous = saveGoogleEnv();
  const previousFetch = globalThis.fetch;
  process.env.GOOGLE_GEMINI_API_KEY = "test-google-key";
  const payload = googlePayload();
  payload.steps = payload.steps.filter((step) => step.type !== "google_search_result");
  globalThis.fetch = async () => new Response(JSON.stringify(payload), { status: 200, headers: { "content-type": "application/json" } });

  try {
    await assert.rejects(
      () => getGoogleDirectGrounding("Когда приняли Конституцию Казахстана?", new AbortController().signal),
      /google_grounding_missing_search_suggestions/,
    );
  } finally {
    globalThis.fetch = previousFetch;
    restoreGoogleEnv(previous);
  }
});

test("v0.24.2 synthetic router matrix keeps factual, current, reasoning and casual tasks separated", () => {
  const cases = [
    ["Какие последние новости Казахстана сегодня?", "fresh_information", "web"],
    ["Какие племена входят в Старший жуз Казахстана?", "fact_lookup", "web"],
    ["Самый многочисленный казахский род?", "fact_lookup", "web"],
    ["Когда была принята действующая Конституция Республики Казахстан?", "fact_lookup", "web"],
    ["Кто сейчас президент Казахстана?", "fresh_information", "web"],
    ["Қазақстанның қазіргі президенті кім?", "fresh_information", "web"],
    ["What is the capital of Kazakhstan?", "fact_lookup", "web"],
    ["Привет. Придумай короткую шутку про программиста.", "conversation", "none"],
    ["Посчитай 17 * 23", "math", "math"],
    ["Напиши функцию на TypeScript для сортировки массива", "code", "code"],
    ["Объясни почему небо голубое", "analysis", "none"],
    ["Сравни REST и GraphQL", "comparison", "none"],
    ["Составь пошаговый план миграции приложения", "planning", "none"],
  ];
  for (const [prompt, intent, toolClass] of cases) {
    const route = routeErmaTask(prompt);
    assert.equal(route.intent, intent, prompt);
    assert.equal(route.toolClass, toolClass, prompt);
  }
});

test("v0.24.2 keeps real conversation follow-ups context-aware without penalizing short self-contained facts", () => {
  assert.equal(isContextDependentGroundingTurn("А кто сейчас?", 5), true);
  assert.equal(isContextDependentGroundingTurn("Расскажи подробнее про него", 5), true);
  assert.equal(isContextDependentGroundingTurn("Как я писал выше, проверь это", 5), true);
  assert.equal(isContextDependentGroundingTurn("Новости Казахстана сегодня", 5), false);
  assert.equal(isContextDependentGroundingTurn("Президент Казахстана сейчас?", 5), false);
  assert.equal(isContextDependentGroundingTurn("А кто сейчас?", 1), false);
});

test("v0.24.2 Kazakhstan exact facts use the strict no-guess fallback policy", () => {
  const route = routeErmaTask("Какие племена входят в Старший жуз Казахстана?");
  assert.match(route.reasonCode, /KAZAKHSTAN/);
  const directive = buildAnswerDirective(route, { status: "unverified", code: "WEB_EVIDENCE_MISSING", evidenceCount: 0 }, "ru");
  assert.match(directive, /Kazakhstan exactness guard/);
  assert.match(directive, /do not guess or reconstruct clan\/tribe\/zhuz membership/);
  assert.match(directive, /Never replace a requested Kazakh entity/);
});

test("v0.24.2 bypasses NVIDIA rewriting for both SSE and JSON API responses", async () => {
  const routeTools = await source("lib/ai/tools/route-tools.ts");
  const session = await source("app/api/demo/stream-session.ts");
  const jsonResponder = await source("app/api/demo/json-responder.ts");
  const transport = await source("hooks/chat-request/transport.ts");

  assert.match(routeTools, /route\.toolClass === "web"/);
  assert.match(routeTools, /getGoogleDirectGrounding\(input\.prompt/);
  assert.match(routeTools, /isContextDependentGroundingTurn/);
  assert.match(routeTools, /fallback_to_erma_search/);
  assert.match(session, /if \(toolAugmentation\.directGrounding\)/);
  assert.match(session, /provider: "google-grounding"/);
  assert.match(session, /text: direct\.answer/);
  assert.match(jsonResponder, /if \(toolAugmentation\.directGrounding\)/);
  assert.match(jsonResponder, /provider: "google-grounding"/);
  assert.match(jsonResponder, /answer: direct\.answer/);
  assert.match(transport, /meta\.actualProvider === "google-grounding"/);
});

test("v0.24.2 deploys the high-quality direct grounding model separately and exposes provider health", async () => {
  const envExample = await source(".env.example");
  const deploy = await source(".github/workflows/deploy-cloudflare.yml");
  const health = await source("worker/health-status.ts");
  assert.match(envExample, /GOOGLE_DIRECT_GROUNDING_MODEL=gemini-3\.6-flash/);
  assert.match(deploy, /GOOGLE_DIRECT_GROUNDING_MODEL:.*gemini-3\.6-flash/);
  assert.match(deploy, /GOOGLE_DIRECT_GROUNDING_MODEL:\$GOOGLE_DIRECT_GROUNDING_MODEL/);
  assert.match(health, /"google_grounding"/);
  assert.match(health, /generativelanguage\.googleapis\.com\/v1beta\/models/);
});

test("v0.24.2 renders required Google Search suggestions in an isolated attribution panel", async () => {
  const panel = await source("components/playground/GoogleGroundingPanel.tsx");
  const messageList = await source("components/playground/MessageList.tsx");

  assert.match(panel, /srcDoc=\{grounding\.searchSuggestionsHtml\}/);
  assert.match(panel, /sandbox="allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"/);
  assert.match(panel, /data-google-grounding/);
  assert.match(panel, /citation\.url/);
  assert.match(messageList, /GoogleGroundingPanel grounding=\{message\.meta\?\.grounding\}/);
});
