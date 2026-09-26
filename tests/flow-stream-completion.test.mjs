import assert from "node:assert/strict";
import test from "node:test";

import { concludeFlowStream, flowStreamToolName, parseFlowStreamFrame } from "../lib/flow/stream.ts";

const messages = { incomplete: "Stream incomplete; partial saved.", stopped: "Stopped; partial saved." };
const complete = { result: "Useful result", receivedDone: true, stopped: false, partial: false, error: "" };

test("Flow completes only a nonempty explicitly completed stream", () => {
  assert.deepEqual(concludeFlowStream(complete, messages), { status: "completed", result: "Useful result" });
  for (const patch of [
    { receivedDone: false },
    { partial: true },
    { error: "Upstream interrupted" },
    { result: "   " },
  ]) {
    const outcome = concludeFlowStream({ ...complete, ...patch }, messages);
    assert.equal(outcome.status, "failed");
    assert.equal(outcome.result, patch.result ?? complete.result);
    assert.equal(outcome.error, patch.error ?? messages.incomplete);
  }
});

test("Flow preserves useful partial content on EOF, failure, and explicit stop", () => {
  const result = "Half of a document\n```ts\nconst value = 1;";
  const eof = concludeFlowStream({ ...complete, result, receivedDone: false }, messages);
  assert.equal(eof.status, "failed");
  assert.equal(eof.result, result);
  const stopped = concludeFlowStream({ ...complete, result, stopped: true, partial: true }, messages);
  assert.deepEqual(stopped, { status: "stopped", result, error: messages.stopped });
});

test("Flow parses server tool names and multiline CRLF events without inventing completion", () => {
  const tool = parseFlowStreamFrame('event: tool\r\ndata: {"name": "search_web",\r\ndata: "status": "success"}');
  assert.equal(tool.event, "tool");
  assert.equal(flowStreamToolName(tool.payload, "Connected"), "search_web");
  assert.equal(flowStreamToolName({ tool: "legacy_guess" }, "Connected"), "Connected");
  const terminal = parseFlowStreamFrame('event: done\ndata: {"stopped":false,"partial":true}');
  assert.equal(concludeFlowStream({ ...complete, partial: terminal.payload.partial }, messages).status, "failed");
  for (const malformed of ['event: done\ndata: null', 'event: done\ndata: []', 'event: done\ndata: "done"', 'event: done\ndata: {']) {
    assert.equal(parseFlowStreamFrame(malformed), null);
  }
});
