import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { getWorkspacePrivacyMode, privacyModeRoute, setWorkspacePrivacyMode, shouldPersistWorkspace } from "../lib/privacy-mode.ts";

function storage() { let value = null; return { getItem() { return value; }, setItem(_key, next) { value = next; } }; }

test("privacy modes default local and ephemeral disables archive persistence", () => { const store = storage(); assert.equal(getWorkspacePrivacyMode(store), "local"); setWorkspacePrivacyMode("ephemeral", store); assert.equal(getWorkspacePrivacyMode(store), "ephemeral"); assert.equal(shouldPersistWorkspace("ephemeral"), false); assert.deepEqual(privacyModeRoute("ephemeral"), ["Device", "TK LAB Worker", "External model provider"]); });

test("chat archive and sync honor ephemeral mode contract", async () => { const archive = await readFile("hooks/use-conversation-archive.ts", "utf8"); const sync = await readFile("lib/workspace-sync-client.ts", "utf8"); assert.match(archive, /shouldPersistWorkspace/); assert.match(sync, /workspace_sync_disabled_in_ephemeral_mode/); });
