import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("v0.17.5 requires compatible migrations and one deployment writer", async () => {
  const migration = await read("scripts/check-migration-safety.mjs");
  const deploy = await read(".github/workflows/deploy-cloudflare.yml");
  assert.match(migration, /TKLABS_DESTRUCTIVE_MIGRATION_REVIEWED/);
  assert.match(deploy, /TKLABS_DEPLOY_WRITER/);
  assert.match(deploy, /github-actions/);
  assert.match(deploy, /production-evidence-/);
});

test("canary and rollback are explicit manual production actions", async () => {
  const canary = await read(".github/workflows/canary-cloudflare.yml");
  const rollback = await read(".github/workflows/rollback-cloudflare.yml");
  assert.match(canary, /workflow_dispatch/);
  assert.match(canary, /versions upload/);
  assert.match(canary, /versions deploy/);
  assert.match(canary, /Canary traffic percentage/);
  assert.match(rollback, /workflow_dispatch/);
  assert.match(rollback, /wrangler rollback/);
  assert.match(rollback, /Rollback reason/);
});

test("final release identity is v0.17.5 Release Safety", async () => {
  const release = await read("lib/release-version.ts");
  const preview = await read("lib/prerelease.ts");
  const worker = await read("public/sw.js");
  const packageJson = JSON.parse(await read("package.json"));
  assert.equal(packageJson.version, "0.17.5");
  assert.match(release, /CURRENT_RELEASE_VERSION = "v0\.17\.5"/);
  assert.match(release, /CURRENT_RELEASE_CODENAME = "Release Safety"/);
  assert.match(preview, /RELEASE SAFETY/);
  assert.match(worker, /CACHE_VERSION = "v0\.17\.5"/);
});
