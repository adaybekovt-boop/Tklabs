import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function text(path) {
  return readFile(new URL(path, root), "utf8");
}

test("CI enforces the checks that protect production changes", async () => {
  const packageJson = JSON.parse(await text("package.json"));
  const workflow = await text(".github/workflows/ci.yml");

  assert.equal(packageJson.scripts.typecheck, "tsc --noEmit");
  assert.match(packageJson.scripts.test, /tests\/\*\.test\.mjs/);
  assert.match(workflow, /npm run typecheck/);
  assert.match(workflow, /npm audit --omit=dev --audit-level=high/);
});

test("provider limits are durable and failed Clodex requests can release allowance", async () => {
  const demoRoute = await text("app/api/demo/route.ts");
  const clodexRoute = await text("app/api/clodex/route.ts");
  const viteConfig = await text("vite.config.ts");
  const worker = await text("worker/index.ts");

  assert.match(demoRoute, /consumeDemoRequest/);
  assert.doesNotMatch(demoRoute, /const requestLog = new Map/);
  assert.match(clodexRoute, /releaseClodexAccess/);
  assert.match(viteConfig, /name: "CLODEX_ACCESS"/);
  assert.doesNotMatch(viteConfig, /DEMO_RATE_LIMIT|tag: "v2"|DemoRateLimit/);
  assert.doesNotMatch(worker, /DemoRateLimit/);

  const clodexWorker = await text("worker/clodex-access.ts");
  const demoAccess = await text("lib/demo-rate-limit-access.ts");
  assert.match(clodexWorker, /consumeDemo/);
  assert.match(demoAccess, /CLODEX_ACCESS/);
  assert.match(demoAccess, /consumeDemo/);
});

test("guest demo access and request-size protection stay aligned", async () => {
  const demoRoute = await text("app/api/demo/route.ts");
  const requestBody = await text("lib/request-body.ts");
  const nextConfig = await text("next.config.ts");

  assert.doesNotMatch(demoRoute, /const session = await auth\(\)/);
  assert.match(demoRoute, /parseJsonBody/);
  assert.match(requestBody, /DEFAULT_JSON_BODY_LIMIT_BYTES/);
  assert.match(requestBody, /RequestBodyTooLargeError/);
  assert.match(nextConfig, /X-Content-Type-Options/);
  assert.match(nextConfig, /Referrer-Policy/);
});

test("chat controls match the server contract", async () => {
  const interfaceSource = await text("components/ui/ai-assistant-interface.tsx");
  const inputSource = await text("components/ui/ai-chat-input.tsx");

  assert.match(interfaceSource, /attachments: meta\.attachments/);
  assert.doesNotMatch(interfaceSource, /searchEnabled|researchEnabled/);
  assert.match(inputSource, /accept="text\/plain,text\/markdown/);
  assert.match(inputSource, /file\.text\(\)/);
});
