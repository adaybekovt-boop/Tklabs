import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import test from "node:test";

async function exists(path) { try { await access(path); return true; } catch { return false; } }

test("IPv6 web guard one-shot workflow is absent from the final tree", async () => {
  assert.equal(await exists(".github/workflows/finalize-v021-ipv6-guard.yml"), false);
});
