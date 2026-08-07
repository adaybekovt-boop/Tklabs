import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  applyWorkspaceVault,
  collectWorkspaceVaultEntries,
  createWorkspaceVault,
  parseWorkspaceVault,
  summarizeWorkspaceVault,
} from "../lib/workspace-vault.ts";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

class MemoryStorage {
  #values = new Map();

  get length() { return this.#values.size; }
  key(index) { return [...this.#values.keys()][index] ?? null; }
  getItem(key) { return this.#values.get(key) ?? null; }
  setItem(key, value) { this.#values.set(String(key), String(value)); }
  removeItem(key) { this.#values.delete(key); }
}

test("Workspace Vault exports only approved local workspace keys", async () => {
  const storage = new MemoryStorage();
  storage.setItem("tklab.archive.v1", JSON.stringify([{ id: "chat-1" }]));
  storage.setItem("tklabs.chat-draft.v1:chat-1", "Draft");
  storage.setItem("tklabs.workspace-artifacts.v1", JSON.stringify([{ id: "artifact-1" }]));
  storage.setItem("tklabs.erma-flow.runs.v1", JSON.stringify([{ id: "run-1" }]));
  storage.setItem("unrelated.secret", "must-not-export");

  const entries = collectWorkspaceVaultEntries(storage);
  assert.equal(entries["unrelated.secret"], undefined);
  assert.equal(Object.keys(entries).length, 4);

  const bundle = await createWorkspaceVault("v0.16.6", storage);
  assert.match(bundle.digest, /^[a-f0-9]{64}$/);
  assert.equal(bundle.schemaVersion, 1);
  assert.equal(bundle.appVersion, "v0.16.6");

  const parsed = await parseWorkspaceVault(JSON.stringify(bundle));
  assert.deepEqual(parsed.entries, bundle.entries);
  assert.deepEqual(summarizeWorkspaceVault(parsed.entries), {
    conversations: 1,
    drafts: 1,
    artifacts: 1,
    flowRuns: 1,
    settings: 0,
    bytes: summarizeWorkspaceVault(bundle.entries).bytes,
  });
});

test("Workspace Vault rejects tampered files", async () => {
  const storage = new MemoryStorage();
  storage.setItem("tklab.archive.v1", "[]");
  const bundle = await createWorkspaceVault("v0.16.6", storage);
  bundle.entries["tklab.archive.v1"] = "[{}]";
  await assert.rejects(() => parseWorkspaceVault(JSON.stringify(bundle)), /integrity check failed/i);
});

test("Workspace Vault merge and replace modes are explicit", async () => {
  const source = new MemoryStorage();
  source.setItem("tklab.archive.v1", "[]");
  source.setItem("tklabs-theme", "dark");
  const bundle = await createWorkspaceVault("v0.16.6", source);

  const target = new MemoryStorage();
  target.setItem("tklabs.response-mode", "analysis");
  applyWorkspaceVault(bundle, "merge", target);
  assert.equal(target.getItem("tklabs.response-mode"), "analysis");
  assert.equal(target.getItem("tklabs-theme"), "dark");

  applyWorkspaceVault(bundle, "replace", target);
  assert.equal(target.getItem("tklabs.response-mode"), null);
  assert.equal(target.getItem("tklabs-theme"), "dark");
});

test("Workspace Vault is discoverable and never calls a server API", async () => {
  const page = await read("app/vault/page.tsx");
  const component = await read("components/vault/WorkspaceVault.tsx");
  const drawer = await read("components/playground/MobileChatDrawer.tsx");
  const footer = await read("components/site/StitchFooter.tsx");
  const release = await read("docs/releases/v0.16.6.md");

  assert.match(page, /WorkspaceVault/);
  assert.match(component, /createWorkspaceVault/);
  assert.match(component, /parseWorkspaceVault/);
  assert.match(component, /importVault\("replace"\)/);
  assert.match(component, /data-workspace-vault-import/);
  assert.doesNotMatch(component, /fetch\(/);
  assert.match(drawer, /href="\/vault"/);
  assert.match(footer, /href="\/vault"/);
  assert.match(release, /SHA-256/);
});
