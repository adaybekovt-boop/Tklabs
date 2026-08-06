import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { inferResponseLanguage, responseLanguageInstruction } from "../lib/ai/response-language.ts";

test("Russian prompt overrides an English interface locale", () => {
  assert.equal(inferResponseLanguage("Объясни, почему поле ввода не работает на телефоне", "en"), "ru");
});

test("English prompt overrides a Russian interface locale", () => {
  assert.equal(inferResponseLanguage("Explain why the mobile composer is clipped", "ru"), "en");
});

test("technical English tokens and fenced code do not force a Russian request into English", () => {
  const prompt = "Исправь этот TypeScript handler и объясни причину ошибки:\n```ts\nconst response = await fetch('/api/demo');\n```";
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

test("provider language instructions are explicit and do not expose interface-locale behavior", () => {
  assert.match(responseLanguageInstruction("ru"), /полностью на русском языке/i);
  assert.match(responseLanguageInstruction("en"), /Reply fully in English/i);

  const nvidia = await readFile(new URL("../lib/ai/providers/nvidia.ts", import.meta.url), "utf8");
  const clodex = await readFile(new URL("../lib/ai/providers/clodex.ts", import.meta.url), "utf8");
  assert.match(nvidia, /inferResponseLanguage\(prompt, interfaceLanguage\)/);
  assert.match(clodex, /inferResponseLanguage\(prompt, interfaceLanguage\)/);
  assert.doesNotMatch(nvidia, /Reply in English and keep the answer natural for the user's language/);
});
