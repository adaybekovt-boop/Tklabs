import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import test from "node:test";

async function exists(path) { try { await access(path); return true; } catch { return false; } }

test("all v0.21 one-shot write workflows remove themselves from the final tree", async () => {
  const paths = [
    ".github/workflows/sync-v021-lock.yml",
    ".github/workflows/sync-v021-current-release.yml",
    ".github/workflows/finalize-v021-answer-routing.yml",
    ".github/workflows/finalize-v021-user-prompt-boundary.yml",
    ".github/workflows/finalize-v021-no-tool-answer-control.yml",
  ];
  for (const path of paths) assert.equal(await exists(path), false, `${path} must be absent`);
});
