import assert from "node:assert/strict";
import test from "node:test";

import { createAiResponseMeta } from "../lib/ai/response.ts";
import { clearArchive, loadArchive, saveSession } from "../lib/local-archive.ts";

function metadata(name, hrefs) {
  return createAiResponseMeta({
    answer: "Based on the sources.", provider: "nvidia", actualModel: "fixture",
    toolCalls: [{ id: "trace-1", name, status: "success", durationMs: 1, summary: "Evidence", links: hrefs.map((href) => ({ label: "Source", href })) }],
  }, "Erma", "request-1", 0, 200, 1).toolCalls[0];
}

test("web tool metadata preserves clickable sources and their exact URL", () => {
  const urls = ["https://example.org/source?query=hello%20world#evidence", "http://example.org/legacy", `/docs/${"a".repeat(300)}`];
  for (const name of ["search_web", "open_web_result"]) {
    assert.deepEqual(metadata(name, urls).links.map((link) => link.href), urls);
  }
  assert.deepEqual(metadata("search_documentation", urls).links.map((link) => link.href), [urls[2]]);
});

test("source metadata rejects unsafe or oversized destinations instead of rewriting them", () => {
  const unsafe = [
    "//evil.example/source", "/\\evil.example/source", "javascript:alert(1)", "data:text/html,hi",
    "https://user:password@example.org/source", "https://example.org/line\nbreak", " https://example.org",
    "https://example.org\\evil", `https://example.org/${"a".repeat(2_000)}`,
  ];
  for (const href of unsafe) assert.equal(metadata("search_web", [href]).links, undefined, href);
});

test("archive loading and saving retain safe web sources and discard unsafe stored links", () => {
  const previousWindow = globalThis.window;
  const href = `https://example.org/source?context=${"a".repeat(300)}`;
  const meta = createAiResponseMeta({ answer: "Evidence", provider: "nvidia", actualModel: "fixture" }, "Erma", "request-1", 0, 200, 1);
  meta.toolCalls = [{ ...metadata("search_web", [href]), links: [{ label: "Evidence", href }, { label: "Bad", href: "//evil.example" }] }];
  const session = { id: "source-session", title: "Sources", model: "Erma", updatedAt: 1, messages: [{ id: "answer-1", role: "assistant", content: "Evidence", meta }] };
  const values = new Map([["tklab.archive.v1", JSON.stringify([session])]]);
  globalThis.window = {
    localStorage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: (key) => values.delete(key),
    },
    dispatchEvent: () => true,
  };
  try {
    const restored = loadArchive()[0];
    assert.deepEqual(restored.messages[0].meta.toolCalls[0].links, [{ label: "Evidence", href }]);
    saveSession({ ...session, id: "new-source-session", updatedAt: 2 });
    const saved = loadArchive().find((entry) => entry.id === "new-source-session");
    assert.deepEqual(saved.messages[0].meta.toolCalls[0].links, [{ label: "Evidence", href }]);
  } finally {
    clearArchive();
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});
