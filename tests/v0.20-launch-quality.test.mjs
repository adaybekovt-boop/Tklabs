import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { getTrustArchitectureReleases } from "../lib/trust-architecture-releases.ts";

test("the full v0.20.0-v0.20.10 Trust Architecture cycle remains in Updates after later releases", () => {
  const versions = getTrustArchitectureReleases("en").map((entry) => entry.version);
  assert.equal(versions[0], "v0.20.10");
  for (let index = 0; index <= 10; index += 1) assert.ok(versions.includes(`v0.20.${index}`));
});

test("Trust Architecture quality gates remain wired into npm check and PR Validate", async () => {
  const packageJson = JSON.parse(await readFile("package.json", "utf8"));
  const ci = await readFile(".github/workflows/ci.yml", "utf8");
  for (const gate of ["trust:legal", "trust:policy", "trust:check"]) {
    assert.match(packageJson.scripts.check, new RegExp(gate.replace(":", "\\:")));
    assert.match(ci, new RegExp(gate.replace(":", "\\:")));
  }
});

test("commercial legal identity is configuration-backed, never invented", async () => {
  const legal = await readFile("lib/legal-documents.ts", "utf8");
  const gate = await readFile("scripts/check-trust-consistency.mjs", "utf8");
  assert.match(legal, /NEXT_PUBLIC_TKLAB_OPERATOR_NAME/);
  assert.match(gate, /TKLABS_COMMERCIAL_LAUNCH/);
  assert.match(gate, /NEXT_PUBLIC_TKLAB_JURISDICTION/);
});
