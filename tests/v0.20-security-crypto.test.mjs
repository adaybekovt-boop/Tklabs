import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { WORKSPACE_SYNC_KEY_VERSION } from "../lib/workspace-sync-server.ts";

test("workspace sync crypto v2 uses HKDF, separate integrity key, AAD, and migration version", async () => {
  assert.equal(WORKSPACE_SYNC_KEY_VERSION, 2);
  const source = await readFile("lib/workspace-sync-server.ts", "utf8");
  assert.match(source, /HKDF/);
  assert.match(source, /additionalData/);
  assert.match(source, /deriveIntegrityKey/);
  assert.match(source, /legacyDecrypt/);
  assert.match(source, /resealed/);
});

test("browser CSP no longer allowlists server-side model providers", async () => {
  const headers = await readFile("lib/security-headers.mjs", "utf8");
  assert.match(headers, /connect-src 'self'/);
  assert.match(headers, /script-src-attr 'none'/);
  assert.doesNotMatch(headers, /connect-src[^\n]+nvidia/i);
  assert.doesNotMatch(headers, /connect-src[^\n]+clodex/i);
});
