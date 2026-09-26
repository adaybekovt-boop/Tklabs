import assert from "node:assert/strict";
import test from "node:test";

import { encodeAgentRunEvent } from "../lib/ai/stream-v2.ts";
import { consumeAiEventStream } from "../hooks/chat-request/transport.ts";
import { applyWorkspaceRunEvent, createWorkspaceRun, updateWorkspaceRun } from "../lib/workspace/run.ts";
import { buildArtifactContextAttachment, completeArtifactRevision, saveRunArtifact } from "../lib/artifacts/workspace-integration.ts";
import { loadArtifacts, updateArtifact, upsertArtifact } from "../lib/artifacts/local-store.ts";
import { applyWorkspaceSnapshot, clearLocalWorkspace, collectWorkspaceSnapshot } from "../lib/workspace-sync-client.ts";

function memoryStorage() {
  const data = new Map();
  return { get length() { return data.size; }, key(index) { return [...data.keys()][index] ?? null; }, getItem(key) { return data.get(key) ?? null; }, setItem(key, value) { data.set(key, String(value)); }, removeItem(key) { data.delete(key); } };
}

function event(name, sequence, payload) { return encodeAgentRunEvent({ event: name, runId: "remote-1", sequence, timestamp: sequence + 100, payload }); }
function streamResponse(chunks) { return new Response(new ReadableStream({ start(controller) { for (const chunk of chunks) controller.enqueue(chunk); controller.close(); } }), { headers: { "content-type": "text/event-stream" } }); }

test("named stream is incremental, deduplicates legacy deltas, and terminates exactly once", async () => {
  const encoder = new TextEncoder();
  const chunks = [event("run.started", 0, {}), event("answer.delta", 1, { text: "Hello" }), encoder.encode('event: delta\ndata: {"text":"Hello"}\n\n'), event("answer.delta", 2, { text: " world" }), event("run.completed", 3, {}), encoder.encode('event: delta\ndata: {"text":"unwanted"}\n\n')];
  const deltas = [], events = [];
  const outcome = await consumeAiEventStream(streamResponse(chunks), { assistantId: "a", requestId: "r" }, { heartbeat() {}, connected() {}, delta(text) { deltas.push(text); }, meta() {}, agentEvent(message) { events.push(message.event); }, networkError: "network" });
  assert.deepEqual(deltas, ["Hello", " world"]);
  assert.deepEqual(events, ["run.started", "answer.delta", "answer.delta", "run.completed"]);
  assert.equal(outcome.content, "Hello world");
  assert.equal(outcome.receivedDone, true);
});

test("interrupted named stream exposes a terminal error and preserves partial answer", async () => {
  const outcome = await consumeAiEventStream(streamResponse([event("answer.delta", 0, { text: "Partial" }), event("run.failed", 1, { error: "Interrupted" })]), { assistantId: "a", requestId: "r" }, { heartbeat() {}, connected() {}, delta() {}, meta() {}, networkError: "network" });
  assert.equal(outcome.content, "Partial");
  assert.equal(outcome.streamError, "Interrupted");
  assert.equal(outcome.receivedDone, true);
});

test("workspace run accepts ordered tool events and rejects late terminal updates", () => {
  const base = createWorkspaceRun({ id: "r", sessionId: "s", assistantMessageId: "m", intent: "Research", model: "erma-auto", mode: "task" });
  const started = applyWorkspaceRunEvent(base, { event: "tool.started", runId: "remote-1", sequence: 0, timestamp: 101, payload: { id: "tool-1", name: "search_web" } });
  const stale = applyWorkspaceRunEvent(started, { event: "tool.started", runId: "remote-1", sequence: 0, timestamp: 102, payload: { id: "tool-2", name: "search_web" } });
  assert.equal(stale.steps.length, 1);
  const finished = applyWorkspaceRunEvent(started, { event: "tool.completed", runId: "remote-1", sequence: 1, timestamp: 103, payload: { id: "tool-1", name: "search_web", status: "success", durationMs: 2, summary: "Found one page" } });
  assert.equal(finished.steps[0].status, "completed");
  assert.equal(finished.toolCalls[0].summary, "Found one page");
  const completed = updateWorkspaceRun(finished, { status: "completed" });
  assert.equal(updateWorkspaceRun(completed, { status: "executing" }).status, "completed");
});

test("artifact revision is guarded against concurrent edits and snapshot includes run history", () => {
  const previous = globalThis.window;
  const storage = memoryStorage();
  globalThis.window = { localStorage: storage, dispatchEvent() {} };
  try {
    const first = saveRunArtifact({ runId: "run-1", sessionId: "s", title: "Report", content: "First" });
    assert.ok(first);
    assert.equal(saveRunArtifact({ runId: "run-1", sessionId: "s", title: "Report", content: "Duplicate" }).id, first.id);
    assert.match(buildArtifactContextAttachment(first).content, /First/);
    upsertArtifact(updateArtifact(first, { content: "Manual edit" }));
    assert.equal(completeArtifactRevision({ artifactId: first.id, expectedContent: "First", content: "AI edit", runId: "run-2", sessionId: "s" }), null);
    assert.equal(loadArtifacts()[0].content, "Manual edit");
    storage.setItem("tklabs.workspace-runs.v1", "[]");
    const snapshot = collectWorkspaceSnapshot(storage);
    const restored = memoryStorage();
    applyWorkspaceSnapshot(snapshot, restored);
    assert.equal(restored.getItem("tklabs.workspace-runs.v1"), "[]");
    clearLocalWorkspace(restored);
    assert.equal(restored.getItem("tklabs.workspace-runs.v1"), null);
  } finally { globalThis.window = previous; }
});
