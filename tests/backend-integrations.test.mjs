import assert from "node:assert/strict";
import test from "node:test";

import { POST as supportPost } from "../app/api/support/route.ts";
import { conversationObjectName } from "../telegram-bot/access.ts";
import { chatWithClodex, initialHistory } from "../telegram-bot/ai.ts";
import { ConversationQueue } from "../telegram-bot/conversation-queue.ts";

function supportRequest(body) {
  return new Request("https://tklabs.uk/api/support", {
    method: "POST",
    headers: { origin: "https://tklabs.uk", "content-type": "application/json" },
    body,
  });
}

test("support rejects null, malformed JSON, and oversized streamed bodies without throwing", async () => {
  for (const body of ["null", "[]", "true", "{", '{}']) {
    assert.equal((await supportPost(supportRequest(body))).status, 400);
  }
  assert.equal((await supportPost(supportRequest(JSON.stringify({ method: "bank", extra: "x".repeat(2_048) })))).status, 413);
});

test("Telegram conversation keys isolate private chats, groups, and users", () => {
  const privateChat = conversationObjectName(42, 42);
  const firstGroup = conversationObjectName(42, -10001);
  const secondGroup = conversationObjectName(42, -10002);
  const otherUser = conversationObjectName(43, -10001);
  assert.equal(new Set([privateChat, firstGroup, secondGroup, otherUser]).size, 4);
  assert.notEqual(privateChat, "user:42", "legacy context may already mix group and private messages");
});

test("Telegram serializes provider writes and resets, and recovers after a failed request", async () => {
  const queue = new ConversationQueue(4);
  const events = [];
  let finishProvider;
  const provider = new Promise((resolve) => { finishProvider = resolve; });
  const first = queue.run(async () => {
    events.push("first-read");
    await provider;
    events.push("first-write");
  });
  const reset = queue.run(async () => { events.push("reset"); });
  const failed = queue.run(async () => { throw new Error("provider unavailable"); });
  const rejection = assert.rejects(failed, /provider unavailable/);
  const next = queue.run(async () => { events.push("next-read"); });
  await Promise.resolve();
  assert.deepEqual(events, ["first-read"], "later messages must wait for the active provider call");
  finishProvider();
  await Promise.all([first, reset, rejection, next]);
  assert.deepEqual(events, ["first-read", "first-write", "reset", "next-read"]);
});

test("Telegram rejects excess queued provider work before it starts", async () => {
  const queue = new ConversationQueue();
  let finishProvider;
  const provider = new Promise((resolve) => { finishProvider = resolve; });
  const active = queue.run(() => provider);
  const waiting = queue.run(async () => "queued");
  let extraStarted = false;
  await assert.rejects(queue.run(async () => { extraStarted = true; }), /conversation_busy/);
  assert.equal(extraStarted, false);
  finishProvider();
  await Promise.all([active, waiting]);
  assert.equal(await queue.run(async () => "recovered"), "recovered");
});

function toolTurn(index) {
  const id = `call-${index}`;
  return [
    { role: "user", content: `check ${index}` },
    { role: "assistant", content: "", tool_calls: [{ id, type: "function", function: { name: "get_server_status", arguments: "{}" } }] },
    { role: "tool", content: "ok", tool_call_id: id },
    { role: "assistant", content: `result ${index}` },
  ];
}

function assertWholeToolTurns(history) {
  let pending = new Set();
  for (const message of history) {
    if (message.role === "system") continue;
    if (message.role === "tool") {
      assert.ok(pending.delete(message.tool_call_id), "tool output must retain its preceding assistant call");
    } else {
      assert.equal(pending.size, 0, "all tool calls must have responses before the next message");
      pending = new Set((message.tool_calls ?? []).map((call) => call.id));
    }
  }
  assert.equal(pending.size, 0);
}

test("Telegram compaction keeps complete tool turns, including legacy truncated history", async () => {
  const originalFetch = globalThis.fetch;
  const providerRequests = [];
  globalThis.fetch = async (_input, init) => {
    providerRequests.push(JSON.parse(init.body).messages);
    return Response.json({ choices: [{ finish_reason: "stop", message: { content: "Done" } }] });
  };
  try {
    const history = [...initialHistory(), ...Array.from({ length: 7 }, (_, index) => toolTurn(index)).flat()];
    const first = await chatWithClodex({ CLODEX_API_KEY: "test-only" }, history, "next");
    assertWholeToolTurns(first.history);
    assert.ok(first.history.length <= 25);
    // An old version may have persisted a slice beginning with a tool result.
    const legacy = [...initialHistory(), ...toolTurn(99).slice(2), ...first.history.slice(1)];
    await chatWithClodex({ CLODEX_API_KEY: "test-only" }, legacy, "again");
    for (const sent of providerRequests) assertWholeToolTurns(sent);
    assert.equal(providerRequests[1][1].role, "user");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
