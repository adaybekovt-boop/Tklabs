import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { safeMarkdownUrl } from "../lib/safe-markdown-url.ts";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("v0.17.3 enforces a compatible CSP and observes a stricter policy", async () => {
  const headers = await read("lib/security-headers.mjs");
  const route = await read("app/api/security/csp-report/route.ts");

  assert.match(headers, /Content-Security-Policy"/);
  assert.match(headers, /Content-Security-Policy-Report-Only/);
  assert.match(headers, /Reporting-Endpoints/);
  assert.match(headers, /report-uri \/api\/security\/csp-report/);
  assert.match(route, /CSP_REPORT_LIMIT_BYTES = 16 \* 1024/);
  assert.match(route, /security\.csp_violation/);
  assert.match(route, /status: 413/);
  assert.doesNotMatch(route, /request\.text\(\)/);
});

test("dependency and secret controls are repository gates", async () => {
  const workflow = await read(".github/workflows/dependency-review.yml");
  const ci = await read(".github/workflows/ci.yml");
  const secretScan = await read("scripts/check-secrets.mjs");
  const packageJson = JSON.parse(await read("package.json"));

  assert.match(workflow, /dependency-review-action@a1d282b36b6f3519aa1f3fc636f609c47dddb294/);
  assert.match(workflow, /fail-on-severity: high/);
  assert.match(ci, /Generate CycloneDX SBOM/);
  assert.match(ci, /supply-chain-evidence-/);
  assert.match(secretScan, /git", \["ls-files", "-z"\]/);
  assert.match(secretScan, /PRIVATE KEY/);
  assert.equal(packageJson.scripts["security:secrets"], "node scripts/check-secrets.mjs");
});

test("Markdown URLs reject executable and opaque protocols", () => {
  assert.equal(safeMarkdownUrl("https://tklabs.uk/status"), "https://tklabs.uk/status");
  assert.equal(safeMarkdownUrl("/status"), "/status");
  assert.equal(safeMarkdownUrl("#details"), "#details");
  assert.equal(safeMarkdownUrl("javascript:alert(1)"), "#blocked-url");
  assert.equal(safeMarkdownUrl("data:text/html,hello"), "#blocked-url");
});
