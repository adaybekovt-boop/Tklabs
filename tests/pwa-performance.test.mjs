import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("PWA runtime is mounted globally and registers a versioned service worker", async () => {
  const layout = await source("app/layout.tsx");
  const runtime = await source("components/pwa/PwaRuntime.tsx");
  const worker = await source("public/sw.js");

  assert.match(layout, /<PwaRuntime\s*\/>/);
  assert.match(runtime, /serviceWorker\.register\("\/sw\.js"/);
  assert.match(runtime, /beforeinstallprompt/);
  assert.match(worker, /CACHE_VERSION = "v0\.16\.4"/);
  assert.doesNotThrow(() => new Function(worker));
});

test("service worker never caches API, auth, admin, or navigation responses", async () => {
  const worker = await source("public/sw.js");
  assert.match(worker, /url\.pathname\.startsWith\("\/api\/"\)/);
  assert.match(worker, /url\.pathname\.startsWith\("\/auth\/"\)/);
  assert.match(worker, /url\.pathname\.startsWith\("\/admin\/"\)/);
  assert.match(worker, /request\.mode === "navigate"/);
  assert.match(worker, /return await fetch\(request\)/);
  assert.match(worker, /caches\.match\(OFFLINE_URL\)/);
  assert.match(worker, /no-store\|private/);
  assert.match(worker, /set-cookie/);
});

test("manifest and offline fallback expose installable application metadata", async () => {
  const manifest = await source("app/manifest.ts");
  const offline = await source("app/offline/page.tsx");
  assert.match(manifest, /id: "\/"/);
  assert.match(manifest, /scope: "\/"/);
  assert.match(manifest, /display: "standalone"/);
  assert.match(manifest, /tk-app-icon\.svg/);
  assert.match(manifest, /shortcuts:/);
  assert.match(offline, /AI-запросы/);
  assert.match(offline, /AI requests/);
});

test("home artwork is local and does not depend on Google image delivery", async () => {
  const home = await source("app/page.tsx");
  assert.match(home, /\/images\/home\/hero-lab\.svg/);
  assert.match(home, /\/images\/home\/lab-cluster\.svg/);
  assert.doesNotMatch(home, /googleusercontent\.com/);
  assert.match(home, /fetchPriority="high"/);
  assert.match(home, /loading="lazy"/);
});

test("production validation enforces explicit client asset budgets", async () => {
  const packageJson = JSON.parse(await source("package.json"));
  const workflow = await source(".github/workflows/ci.yml");
  const budget = await source("scripts/check-performance-budget.mjs");
  assert.equal(packageJson.scripts["perf:budget"], "node scripts/check-performance-budget.mjs");
  assert.match(packageJson.scripts.check, /npm run perf:budget/);
  assert.match(workflow, /name: Performance budget/);
  assert.match(budget, /javascriptRaw/);
  assert.match(budget, /javascriptGzip/);
  assert.match(budget, /largestImage/);
});
