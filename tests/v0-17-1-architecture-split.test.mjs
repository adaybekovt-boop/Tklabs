import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("v0.17.1 keeps the demo route as a thin orchestrator", async () => {
  const route = await read("app/api/demo/route.ts");
  const requestContext = await read("app/api/demo/request-context.ts");
  const jsonResponder = await read("app/api/demo/json-responder.ts");
  const streamSession = await read("app/api/demo/stream-session.ts");

  assert.ok(route.split(/\r?\n/).length <= 24);
  assert.match(route, /prepareDemoRequest/);
  assert.match(route, /respondWithDemoJson/);
  assert.match(route, /new DemoStreamSession/);
  assert.doesNotMatch(route, /from "\.\/quota"|from "@\/lib\/ai\/providers\/nvidia"|from "@\/lib\/ai\/providers\/mesh"/);
  assert.doesNotMatch(route, /\bcreateDemoQuota\s*\(|\bgenerateWithNvidia\s*\(|\bstreamWithNvidia\s*\(|\bgenerateWithErmaMesh\s*\(|\bstreamWithErmaMesh\s*\(/);
  assert.match(requestContext, /prepareChatContext/);
  assert.match(requestContext, /createDemoQuota/);
  assert.match(jsonResponder, /generateWithErmaMesh/);
  assert.match(streamSession, /streamWithErmaMesh/);
  assert.match(streamSession, /class DemoStreamSession/);
  assert.match(streamSession, /cancel: async/);
});

test("chat request state, transport, and persistence are independently testable", async () => {
  const hook = await read("hooks/use-chat-request.ts");
  const state = await read("hooks/chat-request/state.ts");
  const transport = await read("hooks/chat-request/transport.ts");
  const persistence = await read("hooks/chat-request/persistence.ts");

  assert.match(hook, /chat-request\/state/);
  assert.match(hook, /chat-request\/transport/);
  assert.match(hook, /chat-request\/persistence/);
  assert.doesNotMatch(hook, /function parseEventBlock/);
  assert.doesNotMatch(hook, /function requestReducer/);
  assert.match(state, /INITIAL_REQUEST_STATE/);
  assert.match(transport, /consumeAiEventStream/);
  assert.match(transport, /safeRetrySeconds/);
  assert.match(transport, /actualProvider/);
  assert.match(persistence, /toContextMessages/);
  assert.match(persistence, /responseSnapshot/);
});