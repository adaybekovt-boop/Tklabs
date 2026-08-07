import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("v0.17.4 defines ownership, contribution evidence, and testing layers", async () => {
  const owners = await read(".github/CODEOWNERS");
  const pr = await read(".github/pull_request_template.md");
  const testing = await read("docs/TESTING.md");
  assert.match(owners, /\/app\/api\//);
  assert.match(owners, /\/\.github\/workflows\//);
  assert.match(pr, /Release evidence/);
  assert.match(pr, /Rollback target/);
  assert.match(testing, /Browser Assurance/);
  assert.match(testing, /CycloneDX/);
});

test("historical v0.9.1 merge files are archived outside the repository root", async () => {
  await access(new URL("../docs/archive/v0.9.1/README.md", import.meta.url));
  for (const path of ["HOTFIX_FILES_V0.9.1.txt", "LUNA_MERGE_INSTRUCTIONS_V0.9.1.md", "PATCH_NOTES_V0.9.1.md", "READY_TO_MERGE_V0.9.1.md"]) {
    await assert.rejects(access(new URL(`../${path}`, import.meta.url)));
  }
});

test("release consistency checker covers package, lock, runtime, cache, and documentation", async () => {
  const checker = await read("scripts/check-release-consistency.mjs");
  assert.match(checker, /package-lock\.json/);
  assert.match(checker, /CURRENT_RELEASE_VERSION/);
  assert.match(checker, /CACHE_VERSION/);
  assert.match(checker, /docs\/releases/);
});
