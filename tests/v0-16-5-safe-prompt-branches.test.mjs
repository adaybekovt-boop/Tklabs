import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("prompt editing creates a safe conversation branch", async () => {
  const chat = await read("components/playground/PlaygroundChat.tsx");

  assert.match(chat, /function editPromptInBranch\(message: ChatMessage\)/);
  assert.match(chat, /const sourceSessionId = archive\.sessionIdRef\.current/);
  assert.match(chat, /archive\.save\(firstPrompt/);
  assert.match(chat, /const previousMessage = messageIndex > 0/);
  assert.match(chat, /branchSession\([\s\S]*previousMessage\.id/);
  assert.match(chat, /chat\.clearMessages\(\)/);
  assert.match(chat, /writeChatDraft\(branchId, message\.content\)/);
  assert.match(chat, /onEdit: editPromptInBranch/);
  assert.doesNotMatch(chat, /onEdit: \(message\) => \{ setInput\(message\.content\)/);
});

test("safe edit keeps an explicit path back to the original conversation", async () => {
  const chat = await read("components/playground/PlaygroundChat.tsx");

  assert.match(chat, /type PromptEditBranchState/);
  assert.match(chat, /function returnToOriginalConversation\(\)/);
  assert.match(chat, /getSession\(promptEditBranch\.sourceSessionId\)/);
  assert.match(chat, /data-branch-preserving-edit/);
  assert.match(chat, /Original conversation preserved/);
  assert.match(chat, /handlePromptSubmit/);
  assert.match(chat, /submitted: true/);
});

test("v0.16.5 release and cache contracts cover safe prompt branches", async () => {
  const releaseVersion = await read("lib/release-version.ts");
  const prerelease = await read("lib/prerelease.ts");
  const releaseDoc = await read("docs/releases/v0.16.5.md");
  const worker = await read("public/sw.js");

  assert.match(releaseVersion, /CURRENT_RELEASE_VERSION = "v0\.16\.5"/);
  assert.match(prerelease, /Safe Prompt Branches/);
  assert.match(prerelease, /исходный диалог сохранён/i);
  assert.match(releaseDoc, /branch-preserving/);
  assert.match(worker, /CACHE_VERSION = "v0\.16\.5"/);
});
