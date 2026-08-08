import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { selectErmaModel } from "../lib/models/server.ts";

async function source(path) { return readFile(path, "utf8"); }

test("v0.22 exposes one concise Erma composer instead of model/mode/effort controls", async () => {
  const input = await source("components/ui/ai-chat-input.tsx");
  const responsive = await source("components/playground/ResponsiveChatComposer.tsx");

  assert.doesNotMatch(input, /CHAT_RESPONSE_MODES|chatResponseModeLabel|EffortBars|ModelMark|settingsOpen|Deep reasoning|Глубокое рассуждение/);
  assert.match(input, /DOCUMENT_ACCEPT/);
  assert.match(input, /extractDocumentFile/);
  assert.match(input, /effort:\s*"medium"/);
  assert.match(responsive, /PromptInput as ResponsiveChatComposer/);
  assert.doesNotMatch(responsive, /quickCommands|\/search|\/code|\/document|\/plan|settingsOpen/);
});

test("legacy response modes no longer inject synthetic instructions into document context", async () => {
  const persistence = await source("hooks/chat-request/persistence.ts");
  assert.doesNotMatch(persistence, /chatResponseModeInstruction|tklabs-response-mode|TK LAB RESPONSE MODE/);
  assert.match(persistence, /return attachments;/);
});

test("Erma Auto tier is selected by the server request route, not hidden client effort toggles", () => {
  const prompt = "Проанализируй архитектуру сервиса и предложи безопасный план миграции";
  const low = selectErmaModel("erma-auto", prompt, { requestedReasoning: false, effort: "low" });
  const high = selectErmaModel("erma-auto", prompt, { requestedReasoning: true, effort: "high" });
  assert.equal(low.key, high.key);
});

test("conversation drawer keeps context and activity while removing duplicated AI tuning", async () => {
  const drawer = await source("components/playground/ChatContextDrawer.tsx");
  const toolbar = await source("components/playground/ChatToolbar.tsx");

  assert.doesNotMatch(drawer, /CHAT_RESPONSE_MODES|chatResponseModeLabel|GitCompareArrows|Settings2|Advanced settings|Расширенные настройки/);
  assert.match(drawer, /What Erma is doing|Что делает Erma/);
  assert.doesNotMatch(toolbar, /CHAT_RESPONSE_MODES|SlidersHorizontal|onReason\(\)|toneCharacter/);
  assert.match(toolbar, /automatically chooses the right depth and tools/);
});

test("browser assurance waits for client-owned Erma surfaces instead of removed tuning controls", async () => {
  const playgroundE2e = await source("e2e/playground.spec.mjs");
  const intelligenceE2e = await source("e2e/intelligence.spec.mjs");

  for (const browserContract of [playgroundE2e, intelligenceE2e]) {
    assert.doesNotMatch(browserContract, /data-locale-toggle/);
    assert.match(browserContract, /data-testid=\\?"prompt-input\\?"|data-testid="prompt-input"/);
  }
  assert.doesNotMatch(playgroundE2e, /mobile-prompt-input/);
});
