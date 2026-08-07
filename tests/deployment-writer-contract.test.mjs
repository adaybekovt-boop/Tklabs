import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("production deploy declares GitHub Actions as the canonical writer", async () => {
  const deploy = await read(".github/workflows/deploy-cloudflare.yml");
  assert.match(deploy, /TKLABS_DEPLOY_WRITER:\s*github-actions/);
  assert.match(deploy, /GitHub Actions must remain the canonical production deployment writer/);
});
