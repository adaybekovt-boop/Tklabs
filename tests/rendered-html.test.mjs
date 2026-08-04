import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const templateRoot = new URL("../", import.meta.url);

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", String(process.pid));
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request("http://localhost/", { headers: { accept: "text/html" } }), { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
}

test("server-renders the localized TK Labs AI workspace", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /Imaginary Intelligence/i);
  assert.match(html, /AI-рабочее|AI workspace/);
  assert.match(html, /Открыть AI-чат|Open AI Chat/);
  assert.match(html, /AI-чаты|AI Chats/);
  assert.match(html, /Основная навигация|Primary navigation/);
  assert.doesNotMatch(html, /Ready to assist|Your site is taking shape|codex-preview|Building your site/i);
});

test("keeps the local build independent from GPT Sites metadata", async () => {
  await assert.rejects(access(new URL(".openai/hosting.json", templateRoot)));
  const viteConfig = await readFile(new URL("../vite.config.ts", import.meta.url), "utf8");
  assert.doesNotMatch(viteConfig, /hosting\.json|sites-vite-plugin|sites\(\)/i);
});
