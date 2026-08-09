import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

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

test("v0.24.2 sends the minimized user query directly to Gemini Google Search and preserves its answer", async () => {
  const previousKey = process.env.GOOGLE_GEMINI_API_KEY;
  const previousFetch = globalThis.fetch;
  process.env.GOOGLE_GEMINI_API_KEY = "test-google-key";
  let requestBody;
  globalThis.fetch = async (_url, init) => {
    requestBody = JSON.parse(String(init?.body ?? "{}"));
    return new Response(JSON.stringify(googlePayload()), { status: 200, headers: { "content-type": "application/json" } });
  };

  try {
    const result = await getGoogleDirectGrounding("Самый многочисленный казахский род?", new AbortController().signal);
    assert.equal(requestBody.input, "Самый многочисленный казахский род?");
    assert.deepEqual(requestBody.tools, [{ type: "google_search", search_types: ["web_search"] }]);
    assert.equal(result.answer, "Самым многочисленным казахским родом часто называют аргын.");
    assert.equal(result.grounding.directPassThrough, true);
    assert.equal(result.grounding.searchSuggestionsHtml, "<div class=\"google-search\">Google Search</div>");
    assert.equal(result.grounding.citations[0].url, "https://example.com/source");
    assert.deepEqual(result.grounding.searchQueries, ["самый многочисленный казахский род"]);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.GOOGLE_GEMINI_API_KEY;
    else process.env.GOOGLE_GEMINI_API_KEY = previousKey;
  }
});

test("v0.24.2 does not direct-pass an answer when Google Search attribution is incomplete", async () => {
  const previousKey = process.env.GOOGLE_GEMINI_API_KEY;
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
    if (previousKey === undefined) delete process.env.GOOGLE_GEMINI_API_KEY;
    else process.env.GOOGLE_GEMINI_API_KEY = previousKey;
  }
});

test("v0.24.2 bypasses NVIDIA rewriting for eligible Google-grounded web routes", async () => {
  const routeTools = await source("lib/ai/tools/route-tools.ts");
  const session = await source("app/api/demo/stream-session.ts");
  const transport = await source("hooks/chat-request/transport.ts");

  assert.match(routeTools, /route\.toolClass === "web"/);
  assert.match(routeTools, /getGoogleDirectGrounding\(input\.prompt/);
  assert.match(routeTools, /fallback_to_erma_search/);
  assert.match(session, /if \(toolAugmentation\.directGrounding\)/);
  assert.match(session, /provider: "google-grounding"/);
  assert.match(session, /text: direct\.answer/);
  assert.match(transport, /meta\.actualProvider === "google-grounding"/);
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
