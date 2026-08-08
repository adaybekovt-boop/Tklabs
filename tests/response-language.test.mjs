import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { inferResponseLanguage, responseLanguageInstruction } from "../lib/ai/response-language.ts";
import { buildNvidiaBody } from "../lib/ai/providers/nvidia.ts";

const TEST_MODEL = {
  key: "language-test",
  name: "Language Test",
  tier: "light",
  nvidiaModel: "test/model",
  status: "available",
  available: true,
  reasoning: false,
  vision: false,
  tools: false,
};

test("Russian prompt overrides an English interface locale", () => {
  assert.equal(inferResponseLanguage("Объясни, почему поле ввода не работает на телефоне", "en"), "ru");
});

test("English prompt overrides a Russian interface locale", () => {
  assert.equal(inferResponseLanguage("Explain why the mobile composer is clipped", "ru"), "en");
});

test("other natural languages are preserved instead of being forced into English", () => {
  assert.equal(inferResponseLanguage("¿Por qué no funciona el campo de entrada?", "en"), "same-as-request");
  assert.equal(inferResponseLanguage("Неліктен енгізу өрісі жұмыс істемейді?", "ru"), "same-as-request");
  assert.equal(inferResponseLanguage("为什么输入框不起作用？", "en"), "same-as-request");
});

test("technical English tokens and fenced code do not force a Russian request into English", () => {
  const prompt = "Исправь этот TypeScript handler и объясни причину ошибки:\n```ts\nconst response = await fetch('/api/demo');\n```";
  assert.equal(inferResponseLanguage(prompt, "en"), "ru");
});

test("attachment bodies cannot override the language of the current request", () => {
  const prompt = "Кратко перескажи приложенный документ.\n\nAttached text files:\n[report.txt]\nThis report is written entirely in English and contains a large amount of English prose.";
  assert.equal(inferResponseLanguage(prompt, "en"), "ru");
});

test("the latest explicit response-language request wins", () => {
  assert.equal(inferResponseLanguage("Опиши решение, но ответь на английском языке", "ru"), "en");
  assert.equal(inferResponseLanguage("Explain the fix, but answer in Russian", "en"), "ru");
});

test("non-linguistic prompts fall back to the interface locale", () => {
  assert.equal(inferResponseLanguage("12345 + 67890", "ru"), "ru");
  assert.equal(inferResponseLanguage("```json\n{\"ok\":true}\n```", "en"), "en");
});

test("NVIDIA request body follows the prompt language instead of the interface language", () => {
  const russianBody = buildNvidiaBody("Почему AI отвечает не на том языке?", "en", TEST_MODEL, false, "medium", false, "professional");
  const englishBody = buildNvidiaBody("Why is the AI using the wrong language?", "ru", TEST_MODEL, false, "medium", false, "professional");
  const spanishBody = buildNvidiaBody("¿Puedes explicar este error?", "en", TEST_MODEL, false, "medium", false, "professional");
  const russianSystem = russianBody.messages[0].content;
  const englishSystem = englishBody.messages[0].content;
  const spanishSystem = spanishBody.messages[0].content;
  assert.match(russianSystem, /Ответь полностью на русском языке/);
  assert.doesNotMatch(russianSystem, /Reply fully in English/);
  assert.match(englishSystem, /Reply fully in English/);
  assert.match(spanishSystem, /same natural language as the current user request/);
  assert.doesNotMatch(spanishSystem, /current user request is detected as English/);
});

test("provider language instructions are explicit and follow the latest user turn", async () => {
  assert.match(responseLanguageInstruction("ru"), /полностью на русском языке/i);
  assert.match(responseLanguageInstruction("en"), /Reply fully in English/i);
  assert.match(responseLanguageInstruction("same-as-request"), /regardless of the interface locale/i);

  const nvidia = await readFile(new URL("../lib/ai/providers/nvidia.ts", import.meta.url), "utf8");
  const clodex = await readFile(new URL("../lib/ai/providers/clodex.ts", import.meta.url), "utf8");
  assert.match(nvidia, /inferResponseLanguage\(latestUserPrompt\(textMessages\), interfaceLanguage\)/);
  assert.match(nvidia, /attachImagesToLatestUser\(textMessages, images\)/);
  assert.match(clodex, /inferResponseLanguage\(latestUserContent\(providerMessages, prompt\), interfaceLanguage\)/);
  assert.doesNotMatch(nvidia, /Reply in English and keep the answer natural for the user's language/);
});