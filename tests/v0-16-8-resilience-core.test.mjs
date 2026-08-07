import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Developers publishes explicit backend and reliability ownership", async () => {
  const developers = await read("app/developers/page.tsx");

  assert.match(developers, /data-developer-ownership/);
  assert.match(developers, /data-resilience-principles/);
  assert.match(developers, /data-engineering-system-map/);
  assert.match(developers, /tkRole: "Backend, качество и отказоустойчивость"/);
  assert.match(developers, /TK отвечает за backend-платформу TK Labs/);
  assert.match(developers, /Backend and Cloudflare Worker runtime/);
  assert.match(developers, /Product architecture and AI systems/);
  assert.match(developers, /Release system/);
});

test("runtime recovery surfaces preserve a deliberate retry path", async () => {
  const routeError = await read("app/error.tsx");
  const globalError = await read("app/global-error.tsx");

  assert.match(routeError, /data-runtime-error-boundary/);
  assert.match(routeError, /onClick=\{reset\}/);
  assert.match(routeError, /href="\/status"/);
  assert.match(routeError, /не удалены/);
  assert.match(globalError, /data-global-error-boundary/);
  assert.match(globalError, /onClick=\{reset\}/);
  assert.doesNotMatch(routeError, /localStorage\.clear/);
  assert.doesNotMatch(globalError, /localStorage\.clear/);
});

test("readiness exposes release identity and required runtime bindings", async () => {
  const ready = await read("app/api/ready/route.ts");

  assert.match(ready, /CURRENT_RELEASE_VERSION/);
  assert.match(ready, /Boolean\(bindings\.DB\)/);
  assert.match(ready, /Boolean\(bindings\.CLODEX_ACCESS\)/);
  assert.match(ready, /Boolean\(bindings\.HEALTH_STATUS\)/);
  assert.match(ready, /"x-tklabs-release"/);
  assert.match(ready, /"cache-control": "no-store"/);
  assert.match(ready, /status: ok \? 200 : 503/);
  assert.doesNotMatch(ready, /API_KEY|AUTH_SECRET/);
});

test("HealthStatus recovers corrupted snapshots and bounds stale fallback", async () => {
  const health = await read("worker/health-status.ts");

  assert.match(health, /PROVIDER_PROBE_ATTEMPTS = 2/);
  assert.match(health, /STALE_TTL_MS = 15 \* 60_000/);
  assert.match(health, /function parseStoredHealth/);
  assert.match(health, /DELETE FROM health_snapshot WHERE slot = 1/);
  assert.match(health, /health\.snapshot_corrupt/);
  assert.match(health, /source: "stale", stale: true/);
  assert.match(health, /cache: "no-store"/);
});

test("CI and integration tests use current action and Node loader runtimes", async () => {
  const ci = await read(".github/workflows/ci.yml");
  const deploy = await read(".github/workflows/deploy-cloudflare.yml");
  const packageJson = JSON.parse(await read("package.json"));
  const loader = await read("tests/register-cloudflare-loader.mjs");

  assert.match(ci, /actions\/checkout@v6/);
  assert.match(ci, /actions\/setup-node@v6/);
  assert.match(ci, /actions\/upload-artifact@v6/);
  assert.doesNotMatch(ci, /actions\/.+@v4/);
  assert.match(deploy, /actions\/checkout@v6/);
  assert.match(deploy, /actions\/setup-node@v6/);
  assert.doesNotMatch(deploy, /actions\/.+@v4/);
  assert.match(packageJson.scripts["test:integration"], /register-cloudflare-loader/);
  assert.doesNotMatch(packageJson.scripts["test:integration"], /experimental-loader/);
  assert.match(loader, /register\(/);
});

test("production deploy verifies the canonical release after Wrangler", async () => {
  const deploy = await read(".github/workflows/deploy-cloudflare.yml");
  const smoke = await read("scripts/smoke-test-production.mjs");
  const packageJson = JSON.parse(await read("package.json"));

  assert.match(deploy, /Resolve release identity/);
  assert.match(deploy, /EXPECTED_RELEASE/);
  assert.match(deploy, /Verify canonical production readiness/);
  assert.match(deploy, /SMOKE_BASE_URL="\$AUTH_URL"/);
  assert.equal(packageJson.scripts["smoke:production"], "node scripts/smoke-test-production.mjs");
  assert.match(smoke, /\/api\/ready/);
  assert.match(smoke, /manifest\.webmanifest/);
  assert.match(smoke, /release_mismatch/);
  assert.match(smoke, /2 \*\* \(attempt - 1\)/);
});

test("v0.16.8 publishes release, cache, and resilience documentation together", async () => {
  const release = await read("lib/release-version.ts");
  const preview = await read("lib/prerelease.ts");
  const worker = await read("public/sw.js");
  const releaseDoc = await read("docs/releases/v0.16.8.md");
  const resilienceDoc = await read("docs/RESILIENCE.md");

  assert.match(release, /CURRENT_RELEASE_VERSION = "v0\.16\.8"/);
  assert.match(release, /CURRENT_RELEASE_CODENAME = "Resilience Core"/);
  assert.match(preview, /codename: "Resilience Core"/);
  assert.match(worker, /CACHE_VERSION = "v0\.16\.8"/);
  assert.match(releaseDoc, /Cloudflare Git Integration/);
  assert.match(resilienceDoc, /TK — backend, quality, and reliability/);
  assert.match(resilienceDoc, /Single deployment writer/);
});
