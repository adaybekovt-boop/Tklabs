import assert from "node:assert/strict";
import test from "node:test";

import { buildChatContext, providerMessages } from "../lib/ai/chat-context";
import { encodeAiStreamEvent, readAiEventStream, splitTextForValidatedStream, type AiStreamEvent } from "../lib/ai/sse";
import { buildNvidiaBody } from "../lib/ai/providers/nvidia";
import { ERMA_MODELS } from "../lib/models/server";

test("chat context keeps recent valid turns and removes leading assistant messages", () => {
  const context = buildChatContext([
    { role: "assistant", content: "orphan" },
    { role: "user", content: "first" },
    { role: "assistant", content: "answer" },
    { role: "user", content: "latest" },
    { role: "assistant", content: "ignored", error: true },
    { role: "system", content: "not allowed" },
  ]);
  assert.deepEqual(context.messages, [
    { role: "user", content: "first" },
    { role: "assistant", content: "answer" },
    { role: "user", content: "latest" },
  ]);
  assert.equal(context.truncated, true);
});

test("chat context applies public and privileged character budgets from the newest turns", () => {
  const history = Array.from({ length: 30 }, (_, index) => ({
    role: index % 2 === 0 ? "user" as const : "assistant" as const,
    content: `${index}:`.padEnd(2_000, "x"),
  }));
  const publicContext = buildChatContext(history);
  const privilegedContext = buildChatContext(history, { privileged: true });
  assert.ok(publicContext.characters <= 24_000);
  assert.ok(publicContext.messages.length <= 24);
  assert.ok(privilegedContext.characters >= publicContext.characters);
  assert.equal(publicContext.messages.at(-1)?.content.startsWith("29:"), true);
});

test("provider messages contain one system prompt, bounded history, and the current prompt", () => {
  const messages = providerMessages("system", [
    { role: "user", content: "hello" },
    { role: "assistant", content: "hi" },
  ], "continue");
  assert.deepEqual(messages, [
    { role: "system", content: "system" },
    { role: "user", content: "hello" },
    { role: "assistant", content: "hi" },
    { role: "user", content: "continue" },
  ]);
});

test("NVIDIA body enables upstream streaming and preserves multi-turn order", () => {
  const body = buildNvidiaBody(
    "continue",
    "en",
    ERMA_MODELS[1],
    true,
    "medium",
    false,
    "professional",
    [
      { role: "user", content: "hello" },
      { role: "assistant", content: "hi" },
    ],
    true,
  );
  assert.equal(body.stream, true);
  const messages = body.messages as Array<{ role: string; content: string }>;
  assert.deepEqual(messages.slice(-3), [
    { role: "user", content: "hello" },
    { role: "assistant", content: "hi" },
    { role: "user", content: "continue" },
  ]);
});

test("validated stream chunking preserves Unicode text", () => {
  const input = "Привет 👋 世界".repeat(20);
  const chunks = splitTextForValidatedStream(input, 7);
  assert.equal(chunks.join(""), input);
  assert.ok(chunks.every((chunk) => Array.from(chunk).length <= 7));
});

test("SSE parser emits typed events across arbitrary byte boundaries", async () => {
  const source = [
    encodeAiStreamEvent({ type: "start", requestId: "request-1", contextMessages: 2, contextCharacters: 10, contextTruncated: false }),
    encodeAiStreamEvent({ type: "delta", text: "Привет" }),
    encodeAiStreamEvent({ type: "done" }),
  ];
  const bytes = new Uint8Array(source.reduce((total, item) => total + item.length, 0));
  let offset = 0;
  for (const item of source) {
    bytes.set(item, offset);
    offset += item.length;
  }
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (let index = 0; index < bytes.length; index += 3) controller.enqueue(bytes.slice(index, index + 3));
      controller.close();
    },
  });
  const events: AiStreamEvent[] = [];
  await readAiEventStream(stream, (event) => events.push(event));
  assert.equal(events[0]?.type, "start");
  assert.deepEqual(events[1], { type: "delta", text: "Привет" });
  assert.equal(events[2]?.type, "done");
});
