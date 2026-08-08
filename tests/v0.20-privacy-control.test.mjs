import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { clearLocalWorkspace, collectWorkspaceSnapshot } from "../lib/workspace-sync-client.ts";

function memoryStorage(seed = {}) {
  const data = new Map(Object.entries(seed));
  return { get length() { return data.size; }, key(index) { return [...data.keys()][index] ?? null; }, getItem(key) { return data.get(key) ?? null; }, setItem(key, value) { data.set(key, String(value)); }, removeItem(key) { data.delete(key); }, clear() { data.clear(); } };
}

test("privacy local export is allowlisted and includes flow runs", () => {
  const storage = memoryStorage({ "tklab.archive.v1": "[]", "tklabs.erma-flow.runs.v1": "[]", "unrelated-secret": "nope" });
  const parsed = JSON.parse(collectWorkspaceSnapshot(storage));
  assert.equal(parsed.values["tklabs.erma-flow.runs.v1"], "[]");
  assert.equal(parsed.values["unrelated-secret"], undefined);
  assert.equal(clearLocalWorkspace(storage), 2);
  assert.equal(storage.getItem("unrelated-secret"), "nope");
});

test("workspace sync exposes explicit authenticated DELETE and account delete requires confirmation", async () => {
  const syncRoute = await readFile("app/api/account/workspace-sync/route.ts", "utf8");
  const privacyRoute = await readFile("app/api/account/privacy/route.ts", "utf8");
  assert.match(syncRoute, /export async function DELETE/);
  assert.match(privacyRoute, /DELETE MY TK LAB DATA/);
  assert.match(privacyRoute, /isTrustedRequestOrigin/);
});
