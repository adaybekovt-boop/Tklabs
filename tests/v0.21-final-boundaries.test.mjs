import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) { return readFile(path, "utf8"); }
async function exists(path) { try { await access(path); return true; } catch { return false; } }

test("legacy current-release helper is synchronized with v0.21.15", async () => {
  const current = await source("lib/releases/current.ts");
  assert.match(current, /v0\.21\.15/);
  assert.match(current, /Erma Intelligence Engine/);
  assert.doesNotMatch(current, /v0\.20\.10/);
});

test("temporary v0.21 write-enabled finalizer workflows are absent", async () => {
  for (const path of [
    ".github/workflows/sync-v021-lock.yml",
    ".github/workflows/sync-v021-current-release.yml",
    ".github/workflows/finalize-v021-answer-routing.yml",
    ".github/workflows/finalize-v021-user-prompt-boundary.yml",
  ]) {
    assert.equal(await exists(path), false, `${path} must not remain in the final tree`);
  }
});

test("cognitive routing uses the validated user prompt separately from attachment/provider context", async () => {
  const requestContext = await source("app/api/demo/request-context.ts");
  const routeTools = await source("lib/ai/tools/route-tools.ts");
  const planner = await source("lib/ai/providers/nvidia-tools.ts");
  const jsonResponder = await source("app/api/demo/json-responder.ts");
  const streamSession = await source("app/api/demo/stream-session.ts");

  assert.match(requestContext, /prompt:\s*validatedPrompt\.prompt/);
  assert.match(routeTools, /prompt:\s*string/);
  assert.match(routeTools, /runNvidiaToolLoop\(\{\s*prompt:\s*input\.prompt/);
  assert.match(planner, /NvidiaToolLoopInput = \{\s*prompt:\s*string/);
  assert.match(planner, /const prompt = input\.prompt/);
  assert.doesNotMatch(planner, /latestUserPrompt/);
  assert.match(jsonResponder, /requestId,\s*prompt,\s*context/);
  assert.match(streamSession, /requestId,\s*prompt,\s*context/);
});

test("no-tool routes still receive Cognitive Router and Answer Intelligence control", async () => {
  const planner = await source("lib/ai/providers/nvidia-tools.ts");
  assert.match(planner, /!route\.shouldPlanTools[\s\S]*controlBlock:\s*controlFor\(route, verification, input\.language\)/);
  assert.match(planner, /!tools\.length[\s\S]*controlBlock:\s*controlFor\(route, verification, input\.language\)/);
  assert.match(planner, /!toolData\.length[\s\S]*controlBlock:\s*controlFor\(route, verification, input\.language\)/);
});
