import assert from "node:assert/strict";
import test from "node:test";

import { prepareChatContext } from "../lib/ai/context.ts";
import { buildStructuredChatMemory, renderStructuredChatMemory } from "../lib/ai/memory.ts";

test("v0.19.3 builds bounded structured memory from explicit conversation text", () => {
  const memory = buildStructuredChatMemory([
    { role: "user", content: "Нужно сделать мобильный интерфейс и сохранить local-first режим." },
    { role: "assistant", content: "Решили использовать единый AppDock вместо двух навигаций." },
    { role: "user", content: "Нельзя добавлять shell или произвольные URL." },
    { role: "user", content: "Дальше нужно добавить синхронизацию, но только опционально." },
  ]);
  const rendered = renderStructuredChatMemory(memory);
  assert.match(rendered, /Goals:/);
  assert.match(rendered, /Decisions:/);
  assert.match(rendered, /Constraints:/);
  assert.match(rendered, /Open tasks:/);
  assert.ok(rendered.length <= 8_000);
});

test("v0.19.3 context compaction keeps recent messages verbatim and older work as structured memory", () => {
  const history = Array.from({ length: 28 }, (_, index) => ({
    role: index % 2 === 0 ? "user" : "assistant",
    content: index < 12
      ? `Goal ${index}: we need to build the workspace with constraint only read-only tools. ${"x".repeat(1800)}`
      : `Recent turn ${index}: ${"y".repeat(1800)}`,
  }));
  const prepared = prepareChatContext({ history, currentUserContent: "Continue the implementation.", contextLimit: 8_192, outputReserve: 2_048 });
  assert.equal(prepared.compacted, true);
  assert.ok(prepared.summary);
  assert.match(prepared.summary ?? "", /Goals:|Constraints:/);
  assert.equal(prepared.messages.at(-1)?.content, "Continue the implementation.");
  assert.ok(prepared.estimatedTokens <= 6_144);
});
