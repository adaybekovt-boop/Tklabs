import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { CURRENT_RELEASE_CODENAME, CURRENT_RELEASE_VERSION } from "../lib/release-version.ts";
import { getTrustArchitectureReleases } from "../lib/trust-architecture-releases.ts";

test("v0.20.9 is the current preview and all ten Trust Architecture stages are in Updates", () => { assert.equal(CURRENT_RELEASE_VERSION, "v0.20.9"); assert.equal(CURRENT_RELEASE_CODENAME, "Trust Architecture"); assert.deepEqual(getTrustArchitectureReleases("en").map((entry) => entry.version), Array.from({ length: 10 }, (_, index) => `v0.20.${index}`)); });
test("launch quality gates are wired into npm check and PR Validate", async () => { const packageJson = JSON.parse(await readFile("package.json", "utf8")); const ci = await readFile(".github/workflows/ci.yml", "utf8"); assert.equal(packageJson.version, "0.20.9"); for (const gate of ["trust:legal", "trust:policy", "trust:check"]) { assert.match(packageJson.scripts.check, new RegExp(gate.replace(":", "\\:"))); assert.match(ci, new RegExp(gate.replace(":", "\\:"))); } });
test("commercial legal identity is configuration-backed, never invented", async () => { const legal = await readFile("lib/legal-documents.ts", "utf8"); const gate = await readFile("scripts/check-trust-consistency.mjs", "utf8"); assert.match(legal, /NEXT_PUBLIC_TKLAB_OPERATOR_NAME/); assert.match(gate, /TKLABS_COMMERCIAL_LAUNCH/); assert.match(gate, /NEXT_PUBLIC_TKLAB_JURISDICTION/); });
