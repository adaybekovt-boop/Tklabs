import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const text = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("v0.15.0 publishes Erma Auto and calm system prompts", async () => {
  const publicModels = await text("lib/models/public.ts");
  const server = await text("lib/models/server.ts");

  assert.match(publicModels, /AUTO_ERMA_MODEL_KEY = "erma-auto"/);
  assert.match(publicModels, /name: "Erma · Auto"/);
  assert.match(publicModels, /DEFAULT_ERMA_MODEL_KEY = AUTO_ERMA_MODEL_KEY/);
  assert.match(publicModels, /resolveAutoErmaModelKey/);
  assert.match(server, /selectErmaModel/);
  assert.match(server, /complexityScore/);
  assert.doesNotMatch(server, /думай вслух/i);
  assert.doesNotMatch(server, /нет абсолютно никаких ограничений/i);
  assert.doesNotMatch(server, /Я нормально всё написал/i);
  assert.doesNotMatch(server, /естественный речевой паразит/i);
  assert.doesNotMatch(server, /показывая ход мыслей/i);
});

test("predictable read-only requests bypass the planner", async () => {
  const intents = await text("lib/ai/tools/intents.ts");
  const recipes = await text("lib/ai/tools/recipes.ts");
  const planner = await text("lib/ai/providers/nvidia-tools.ts");

  assert.match(intents, /detectDirectToolRecipe/);
  assert.match(intents, /name: "calculate"/);
  assert.match(intents, /name: "get_service_status"/);
  assert.match(intents, /name: "search_patch_notes"/);
  assert.match(intents, /name: "search_local_archive"/);
  assert.match(recipes, /executeReadOnlyTool/);
  assert.match(planner, /const direct = await runDirectToolRecipe/);
  assert.match(planner, /if \(direct\) return direct/);
});

test("ambiguous tool planning uses the bounded Lite planner", async () => {
  const planner = await text("lib/ai/providers/nvidia-tools.ts");
  const registry = await text("lib/ai/tools/registry.ts");

  assert.match(planner, /model\.tier === "light"/);
  assert.match(planner, /max_tokens: 256/);
  assert.match(planner, /input\.messages\.slice\(-4\)/);
  assert.match(registry, /MAX_AI_TOOL_ROUNDS = 3/);
  assert.match(registry, /DEFAULT_AI_TOOL_CALLS = 3/);
  assert.match(registry, /MAX_AI_TOOL_CALLS = 6/);
});

test("local archive data is attached only to explicit history requests", async () => {
  const hook = await text("hooks/use-chat-request.ts");
  const intents = await text("lib/ai/tools/intents.ts");

  assert.match(intents, /shouldIncludeLocalArchive/);
  assert.match(hook, /shouldIncludeLocalArchive\(prompt\) \? buildLocalArchiveSearchIndex\(\) : \[\]/);
  assert.match(hook, /endpoint === "\/api\/demo" && localArchive\.length/);
});

test("normal chat UI hides provider diagnostics and uses compact action menus", async () => {
  const messages = await text("components/playground/MessageList.tsx");
  const activity = await text("components/playground/AgentActivity.tsx");
  const workspace = await text("components/playground/PlaygroundChat.tsx");
  const archive = await text("components/playground/ConversationArchive.tsx");

  assert.match(messages, /<AgentActivity calls=\{message\.meta\?\.toolCalls\}/);
  assert.match(messages, /MoreHorizontal/);
  assert.doesNotMatch(messages, /Latency:/);
  assert.doesNotMatch(messages, /TTFT:/);
  assert.doesNotMatch(messages, /Request ID:/);
  assert.doesNotMatch(messages, /actualProvider/);
  assert.doesNotMatch(activity, /durationMs/);
  assert.match(activity, /data-agent-activity/);
  assert.doesNotMatch(workspace, /ChatToolbar/);
  assert.match(workspace, /contextWarning/);
  assert.match(archive, /MoreHorizontal/);
});

test("site structure is reduced without breaking old access links", async () => {
  const nav = await text("components/site/GlowNav.tsx");
  const access = await text("app/access/page.tsx");
  const models = await text("app/models/page.tsx");

  assert.equal((nav.match(/activeKey:/g) ?? []).length, 4);
  assert.match(nav, /labels\.chat/);
  assert.match(nav, /labels\.models/);
  assert.match(nav, /labels\.updates/);
  assert.match(nav, /labels\.status/);
  assert.match(access, /redirect\("\/models#access"\)/);
  assert.match(models, /PUBLIC_ERMA_AUTO_MODEL/);
  assert.match(models, /id="access"/);
});

test("Patch Notes retain the v0.15.0 historical release", async () => {
  const releases = await text("lib/latest-release.ts");
  const document = await text("docs/releases/v0.15.0.md");

  assert.match(releases, /version: "v0\.15\.0"/);
  assert.match(document, /v0\.15\.0 — Calm Workspace and Practical Agent/);
  assert.match(document, /direct recipes/);
  assert.match(document, /Erma · Auto/);
});
