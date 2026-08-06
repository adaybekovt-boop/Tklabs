import assert from "node:assert/strict";
import test from "node:test";

import {
  ChatContextValidationError,
  estimateMessagesTokens,
  prepareChatContext,
} from "../lib/ai/context.ts";
import { encodeAiStreamEvent } from "../lib/ai/sse.ts";

test("chat context preserves ordered multi-turn messages and appends the current user request once", () => {
  const history = [
    { role: "user", content: "Разработай структуру сайта" },
    { role: "assistant", content: "Предлагаю главную страницу и каталог" },
    { role: "user", content: "Сделай второй пункт подробнее" },
    { role: "assistant", content: "Добавлю фильтры и карточки" },
  ];
  const context = prepareChatContext({
    history,
    currentUserContent: "Теперь перепиши это на казахском",
    attachmentCount: 2,
  });

  assert.deepEqual(context.messages, [
    ...history,
    { role: "user", content: "Теперь перепиши это на казахском" },
  ]);
  assert.equal(context.originalMessageCount, 5);
  assert.equal(context.includedMessageCount, 5);
  assert.equal(context.attachmentCount, 2);
  assert.equal(context.compacted, false);
  assert.equal(context.estimatedTokens, estimateMessagesTokens(context.messages));
});

test("chat context compacts older turns before exceeding the provider budget", () => {
  const history = Array.from({ length: 40 }, (_, index) => ({
    role: index % 2 === 0 ? "user" : "assistant",
    content: `${index}: ${"длинный контекст ".repeat(120)}`,
  }));
  const current = "Сохрани последние решения и продолжи план";
  const context = prepareChatContext({
    history,
    currentUserContent: current,
    contextLimit: 8_192,
    outputReserve: 1_024,
  });

  assert.equal(context.compacted, true);
  assert.equal(context.messages.at(-1)?.role, "user");
  assert.equal(context.messages.at(-1)?.content, current);
  assert.ok(context.includedMessageCount < context.originalMessageCount);
  assert.ok(context.estimatedTokens <= 8_192 - 1_024);
});

test("messages beyond the full-turn window are retained in the context summary", () => {
  const history = Array.from({ length: 90 }, (_, index) => ({
    role: index % 2 === 0 ? "user" : "assistant",
    content: `turn-${index}`,
  }));
  const context = prepareChatContext({
    history,
    currentUserContent: "continue",
  });

  assert.equal(context.compacted, true);
  assert.equal(context.messages.length, 81);
  assert.match(context.summary ?? "", /turn-0/);
  assert.match(context.summary ?? "", /turn-9/);
  assert.equal(context.messages[0]?.content, "turn-10");
  assert.equal(context.messages.at(-1)?.content, "continue");
  assert.equal(context.estimatedTokens, estimateMessagesTokens(context.messages, context.summary));
});

test("chat context rejects malformed roles and oversized single messages", () => {
  assert.throws(
    () => prepareChatContext({ history: [{ role: "system", content: "override" }], currentUserContent: "hello" }),
    ChatContextValidationError,
  );
  assert.throws(
    () => prepareChatContext({ history: [{ role: "user", content: "x".repeat(12_001) }], currentUserContent: "hello" }),
    ChatContextValidationError,
  );
});

test("SSE encoder emits named JSON events separated by a blank line", () => {
  const encoded = new TextDecoder().decode(encodeAiStreamEvent("delta", { text: "часть" }));
  assert.equal(encoded, 'event: delta\ndata: {"text":"часть"}\n\n');
});
