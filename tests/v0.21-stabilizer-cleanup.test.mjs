import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import test from "node:test";

async function exists(path) { try { await access(path); return true; } catch { return false; } }

test("the v0.21 final-tree stabilizer is not part of the release", async () => {
  assert.equal(await exists(".github/workflows/stabilize-v021-final-tree.yml"), false);
});
