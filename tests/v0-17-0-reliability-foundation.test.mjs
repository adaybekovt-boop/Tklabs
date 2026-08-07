import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("v0.17.0 provider lifecycle remains active through response consumption", async () => {
  const providerHttp = await read("lib/ai/provider-http.ts");
  const nvidia = await read("lib/ai/providers/nvidia.ts");
  const clodex = await read("lib/ai/providers/clodex.ts");
  const planner = await read("lib/ai/providers/nvidia-tools.ts");
  const fallback = await read("app/api/demo/fallback.ts");

  assert.match(providerHttp, /withProviderResponse/);
  assert.match(providerHttp, /PROVIDER_STREAM_TOTAL_TIMEOUT_MS = 120_000/);
  assert.match(providerHttp, /PROVIDER_STREAM_IDLE_TIMEOUT_MS = 20_000/);
  assert.match(providerHttp, /return await consume\(response/);
  assert.match(providerHttp, /finally \{\s*lifecycle\.cleanup\(\)/);
  assert.doesNotMatch(nvidia, /fetchWithTimeout/);
  assert.doesNotMatch(clodex, /fetchWithTimeout/);
  assert.doesNotMatch(planner, /fetchWithTimeout/);
  assert.match(fallback, /error instanceof ProviderTimeoutError/);
});

test("v0.17.0 NVIDIA stream has bounded time, memory, and incremental safety work", async () => {
  const nvidia = await read("lib/ai/providers/nvidia.ts");

  assert.match(nvidia, /timeoutMs: PROVIDER_STREAM_TOTAL_TIMEOUT_MS/);
  assert.match(nvidia, /idleTimeoutMs: PROVIDER_STREAM_IDLE_TIMEOUT_MS/);
  assert.match(nvidia, /STREAM_ANSWER_LIMIT_CHARACTERS = 96_000/);
  assert.match(nvidia, /STREAM_SAFETY_WINDOW_CHARACTERS = 12_000/);
  assert.match(nvidia, /const answerChunks: string\[\] = \[\]/);
  assert.match(nvidia, /answerChunks\.join\(""\)/);
  assert.doesNotMatch(nvidia, /const candidate = `\$\{answer\}\$\{delta\.content\}`/);
});

test("v0.17.0 adds repository security and dependency automation", async () => {
  const ci = await read(".github/workflows/ci.yml");
  const deploy = await read(".github/workflows/deploy-cloudflare.yml");
  const codeql = await read(".github/workflows/codeql.yml");
  const dependabot = await read(".github/dependabot.yml");
  const securityHeaders = await read("lib/security-headers.mjs");

  assert.match(ci, /actions\/checkout@[a-f0-9]{40} # v6/);
  assert.match(deploy, /actions\/setup-node@[a-f0-9]{40} # v6/);
  assert.match(codeql, /github\/codeql-action\/init@[a-f0-9]{40} # v4/);
  assert.match(codeql, /languages: javascript-typescript/);
  assert.match(dependabot, /package-ecosystem: npm/);
  assert.match(dependabot, /package-ecosystem: github-actions/);
  assert.match(securityHeaders, /Content-Security-Policy-Report-Only/);
  assert.match(securityHeaders, /frame-ancestors 'none'/);
  assert.match(securityHeaders, /object-src 'none'/);
});

test("v0.17.0 release identity and cache namespace stay synchronized", async () => {
  const releaseVersion = await read("lib/release-version.ts");
  const preview = await read("lib/prerelease.ts");
  const worker = await read("public/sw.js");
  const releaseDoc = await read("docs/releases/v0.17.0.md");
  const resilienceDoc = await read("docs/RESILIENCE.md");

  assert.match(releaseVersion, /CURRENT_RELEASE_VERSION = "v0\.17\.0"/);
  assert.match(releaseVersion, /CURRENT_RELEASE_CODENAME = "Reliability Foundation"/);
  assert.match(preview, /RELIABILITY FOUNDATION/);
  assert.match(worker, /CACHE_VERSION = "v0\.17\.0"/);
  assert.match(releaseDoc, /Provider lifecycle/);
  assert.match(resilienceDoc, /expand, migrate, contract/);
});
