import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("v0.13.0 client sends conversation history and consumes typed SSE", async () => {
  const hook = await read("hooks/use-chat-request.ts");
  assert.match(hook, /const history = contextHistory\(messagesRef\.current\)/);
  assert.match(hook, /body: JSON\.stringify\(\{[\s\S]*?history,/);
  assert.match(hook, /endpoint = streaming \? "\/api\/demo\/stream"/);
  assert.match(hook, /readAiEventStream\(response\.body/);
  assert.match(hook, /event\.type === "delta"/);
  assert.match(hook, /streamedContent \+= event\.text/);
  assert.doesNotMatch(hook, /setMessages\(\(current\) => \{\s*const assistant[\s\S]*?throw new Error/);
});

test("stream route keeps request security, quotas, safety, and no-store SSE headers", async () => {
  const route = await read("app/api/demo/stream/route.ts");
  assert.match(route, /isTrustedRequestOrigin/);
  assert.match(route, /parseJsonBody/);
  assert.match(route, /buildChatContext\(body\?\.history/);
  assert.match(route, /reserveDemoRequest/);
  assert.match(route, /commitDemoRequest/);
  assert.match(route, /releaseDemoRequest/);
  assert.match(route, /classifyPromptSafety/);
  assert.match(route, /"content-type": "text\/event-stream; charset=utf-8"/);
  assert.match(route, /"cache-control": "no-store, no-transform"/);
  assert.match(route, /stream: true/);
});

test("NVIDIA streaming retains a JSON-compatible legacy path", async () => {
  const provider = await read("lib/ai/providers/nvidia.ts");
  assert.match(provider, /stream = false/);
  assert.match(provider, /collectNvidiaStream/);
  assert.match(provider, /collectNvidiaJson/);
  assert.match(provider, /accept: stream \? "text\/event-stream" : "application\/json"/);
});

test("raw reasoning is evaluated server-side and absent from SSE events", async () => {
  const sse = await read("lib/ai/sse.ts");
  const provider = await read("lib/ai/providers/nvidia.ts");
  const route = await read("app/api/demo/stream/route.ts");
  assert.doesNotMatch(sse, /thinking|reasoning_content/);
  assert.match(provider, /evaluateAssistantContent\(normalized/);
  assert.doesNotMatch(route, /reasoning_content|thinking:/);
});

test("v0.13.0 is current while v0.12.0 remains in release history", async () => {
  const releases = await read("lib/latest-release.ts");
  const page = await read("app/patch-notes/page.tsx");
  assert.match(releases, /version: "v0\.13\.0"/);
  assert.match(releases, /getPreviousReleaseV0120/);
  assert.match(page, /getPreviousReleaseV0120/);
  assert.match(page, /oldestPreservedRelease/);
});
