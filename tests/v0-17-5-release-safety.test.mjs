import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("v0.17.5 requires compatible migrations and one deployment writer", async () => { const migration = await read("scripts/check-migration-safety.mjs"); const deploy = await read(".github/workflows/deploy-cloudflare.yml"); assert.match(migration, /TKLABS_DESTRUCTIVE_MIGRATION_REVIEWED/); assert.match(deploy, /TKLABS_DEPLOY_WRITER/); assert.match(deploy, /github-actions/); assert.match(deploy, /production-evidence-/); });
test("canary and rollback are explicit manual production actions", async () => { const canary = await read(".github/workflows/canary-cloudflare.yml"); const rollback = await read(".github/workflows/rollback-cloudflare.yml"); assert.match(canary, /workflow_dispatch/); assert.match(canary, /versions upload/); assert.match(canary, /versions deploy/); assert.match(canary, /Canary traffic percentage/); assert.match(rollback, /workflow_dispatch/); assert.match(rollback, /wrangler rollback/); assert.match(rollback, /Rollback reason/); });
test("v0.17.5 Release Safety remains archived after later releases", async () => { const release = await read("lib/release-version.ts"); const releaseDoc = await read("docs/releases/v0.17.5.md"); const packageJson = JSON.parse(await read("package.json")); assert.equal(packageJson.version, "0.20.9"); assert.match(release, /CURRENT_RELEASE_VERSION = "v0\.20\.9"/); assert.match(release, /CURRENT_RELEASE_CODENAME = "Trust Architecture"/); assert.match(releaseDoc, /v0\.17\.5 — Release Safety/); assert.match(releaseDoc, /single deployment writer|migration/i); });
