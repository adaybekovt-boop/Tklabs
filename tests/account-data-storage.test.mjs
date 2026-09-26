import assert from "node:assert/strict";
import test from "node:test";

import { sqliteD1 } from "./helpers/d1-sqlite.mjs";
import { CURRENT_LEGAL_BUNDLE_VERSION } from "../lib/legal-documents.ts";
import { legacyTermsUserId, termsUserId } from "../lib/terms-user-id.ts";
import { PERSONAL_MEMORY_STORAGE_KEY } from "../lib/ai/personal-memory.ts";
import { clearLocalWorkspace, collectLocalWorkspaceSnapshot, collectWorkspaceSnapshot } from "../lib/workspace-sync-client.ts";
import { collectWorkspaceVaultEntries } from "../lib/workspace-vault.ts";
import { MAX_WORKSPACE_SYNC_PAYLOAD_BYTES } from "../lib/workspace-sync-limits.ts";

const email = "owner@example.com";
const originalEnv = { ...process.env };
globalThis.__tklabsCloudflareEnv = {};
const { getWorkspaceSnapshot, putWorkspaceSnapshot, WorkspaceSyncConflictError, WorkspaceSyncUnavailableError } = await import("../lib/workspace-sync-server.ts");
const { acceptTerms, getTermsConsentStatus } = await import("../lib/terms-consent.ts");
const { deleteAccountData } = await import("../lib/privacy-server.ts");
let db;

test.beforeEach(async () => {
  process.env.TERMS_USER_ID_SECRET = "data-tests-terms-identity-secret";
  process.env.ACCOUNT_ID_SECRET = "data-tests-account-identity-secret";
  process.env.WORKSPACE_SYNC_SECRET = "data-tests-legacy-encryption-secret-32";
  process.env.WORKSPACE_SYNC_SECRET_V2 = "data-tests-current-encryption-secret-32";
  db = await sqliteD1();
  globalThis.__tklabsCloudflareEnv.DB = db;
  globalThis.__tklabsCloudflareEnv.CLODEX_ACCESS = {
    getByName: () => ({ getStatus: async () => ({ hasGrant: true }), revoke: async () => ({ revoked: true }) }),
  };
});

test.afterEach(() => {
  db.sqlite.close();
  globalThis.__tklabsAuth = undefined;
  for (const key of Object.keys(process.env)) if (!(key in originalEnv)) delete process.env[key];
  Object.assign(process.env, originalEnv);
});

async function seedUser(userEmail = email, legacy = false) {
  const id = await (legacy ? legacyTermsUserId(userEmail) : termsUserId(userEmail));
  db.sqlite.prepare("INSERT INTO users (id, email, created_at, updated_at) VALUES (?, ?, ?, ?)").run(id, userEmail, Date.now(), Date.now());
  return id;
}

async function seedLegacySnapshot(id, userEmail = email, payload = '{"old":"snapshot"}') {
  const encoder = new TextEncoder();
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(`${process.env.WORKSPACE_SYNC_SECRET}\n${userEmail}`));
  const key = await crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(payload));
  const checksum = Buffer.from(await crypto.subtle.digest("SHA-256", encoder.encode(payload))).toString("hex");
  db.sqlite.prepare("INSERT INTO workspace_snapshots (user_id, ciphertext, iv, checksum, revision, updated_at, key_version) VALUES (?, ?, ?, ?, 1, ?, 1)")
    .run(id, Buffer.from(ciphertext).toString("base64"), Buffer.from(iv).toString("base64"), checksum, Date.now() - 10_000);
}

test("legacy crypto migration cannot overwrite a concurrent newer workspace", async () => {
  const id = await seedUser();
  await seedLegacySnapshot(id);
  let raced = false;
  db.beforeQuery = async (query) => {
    if (!/^update "workspace_snapshots" set "ciphertext"/.test(query)) return;
    db.beforeQuery = null;
    raced = true;
    await putWorkspaceSnapshot(email, '{"new":"snapshot"}', 1);
  };
  const earlier = await getWorkspaceSnapshot(email);
  assert.equal(raced, true);
  assert.equal(earlier.payload, '{"old":"snapshot"}');
  assert.equal(earlier.revision, 1);
  assert.equal(earlier.keyVersion, 1);
  const latest = await getWorkspaceSnapshot(email);
  assert.equal(latest.payload, '{"new":"snapshot"}');
  assert.equal(latest.revision, 2);
  assert.equal(latest.keyVersion, 2);
});

test("reading an absent workspace does not recreate a deleted account", async () => {
  assert.equal(await getWorkspaceSnapshot(email), null);
  assert.equal(db.sqlite.prepare("SELECT count(*) AS count FROM users").get().count, 0);
});

test("legacy snapshot migrates and cross-account ciphertext substitution is rejected", async () => {
  const id = await seedUser();
  await seedLegacySnapshot(id);
  const migrated = await getWorkspaceSnapshot(email);
  assert.equal(migrated.keyVersion, 2);
  assert.equal((await getWorkspaceSnapshot(email)).payload, migrated.payload);
  const otherId = await seedUser("other@example.com");
  db.sqlite.prepare("INSERT INTO workspace_snapshots SELECT ?, ciphertext, iv, checksum, revision, updated_at, key_version FROM workspace_snapshots WHERE user_id = ?").run(otherId, id);
  await assert.rejects(getWorkspaceSnapshot("other@example.com"), WorkspaceSyncUnavailableError);
});

test("two competing initial uploads preserve the winner and conflict the stale request", async () => {
  await seedUser();
  let raced = false;
  db.beforeQuery = async (query) => {
    if (!/^insert into "workspace_snapshots"/.test(query)) return;
    db.beforeQuery = null;
    raced = true;
    await putWorkspaceSnapshot(email, '{"winner":true}', 0);
  };
  await assert.rejects(putWorkspaceSnapshot(email, '{"stale":true}', 0), WorkspaceSyncConflictError);
  assert.equal(raced, true);
  assert.equal((await getWorkspaceSnapshot(email)).payload, '{"winner":true}');
});

test("configuring the dedicated V2 secret keeps older V2 snapshots readable and rekeys them", async () => {
  delete process.env.WORKSPACE_SYNC_SECRET_V2;
  await putWorkspaceSnapshot(email, '{"beforeDedicatedKey":true}', 0);
  const original = db.sqlite.prepare("SELECT ciphertext, checksum FROM workspace_snapshots").get();
  process.env.WORKSPACE_SYNC_SECRET_V2 = "new-dedicated-workspace-secret-32-characters";
  const restored = await getWorkspaceSnapshot(email);
  assert.equal(restored.payload, '{"beforeDedicatedKey":true}');
  assert.equal(restored.revision, 1);
  const migrated = db.sqlite.prepare("SELECT ciphertext, checksum FROM workspace_snapshots").get();
  assert.notEqual(migrated.ciphertext, original.ciphertext);
  assert.notEqual(migrated.checksum, original.checksum);
  delete process.env.WORKSPACE_SYNC_SECRET;
  assert.equal((await getWorkspaceSnapshot(email)).payload, restored.payload);
});

test("an in-flight first upload cannot recreate a backup after account deletion", async () => {
  await seedUser();
  db.beforeQuery = async (query) => {
    if (!/^insert into "workspace_snapshots"/.test(query)) return;
    db.beforeQuery = null;
    await deleteAccountData(email);
  };
  await assert.rejects(putWorkspaceSnapshot(email, '{"afterDelete":true}', 0), WorkspaceSyncConflictError);
  assert.equal(db.sqlite.prepare("SELECT count(*) AS count FROM users").get().count, 0);
  assert.equal(db.sqlite.prepare("SELECT count(*) AS count FROM workspace_snapshots").get().count, 0);
});

test("failed identity migration rolls back all related rows", async () => {
  const legacyId = await seedUser(email, true);
  await seedLegacySnapshot(legacyId);
  db.sqlite.prepare("INSERT INTO legal_acceptances VALUES ('consent', ?, 'old', 'digest', 'en', ?)").run(legacyId, Date.now());
  db.sqlite.prepare("INSERT INTO audit_events VALUES ('event', ?, 'legal.accepted', ?)").run(legacyId, Date.now());
  db.sqlite.exec("CREATE TRIGGER reject_identity BEFORE UPDATE OF id ON users BEGIN SELECT RAISE(ABORT, 'injected_identity_failure'); END;");
  await assert.rejects(getTermsConsentStatus({ email }));
  for (const table of ["workspace_snapshots", "legal_acceptances", "audit_events"]) {
    assert.equal(db.sqlite.prepare(`SELECT user_id FROM ${table}`).get().user_id, legacyId);
  }
  assert.equal(db.sqlite.prepare("SELECT id FROM users").get().id, legacyId);
  db.sqlite.exec("DROP TRIGGER reject_identity");
  await getTermsConsentStatus({ email });
  const currentId = await termsUserId(email);
  assert.equal(db.sqlite.prepare("SELECT id FROM users").get().id, currentId);
  assert.equal(db.sqlite.prepare("SELECT user_id FROM workspace_snapshots").get().user_id, currentId);
});

test("consent is not accepted unless its legal evidence can be stored", async () => {
  await seedUser();
  db.sqlite.exec("CREATE TRIGGER reject_consent BEFORE INSERT ON legal_acceptances BEGIN SELECT RAISE(ABORT, 'injected_consent_failure'); END;");
  await assert.rejects(acceptTerms({ email }, "en", CURRENT_LEGAL_BUNDLE_VERSION));
  assert.equal(db.sqlite.prepare("SELECT terms_accepted FROM users").get().terms_accepted, 0);
  assert.equal(db.sqlite.prepare("SELECT count(*) AS count FROM audit_events").get().count, 0);
  db.sqlite.exec("DROP TRIGGER reject_consent");
  assert.equal((await acceptTerms({ email }, "en", CURRENT_LEGAL_BUNDLE_VERSION)).required, false);
  assert.equal(db.sqlite.prepare("SELECT count(*) AS count FROM legal_acceptances").get().count, 1);
});

test("in-flight consent cannot leave legal records after account deletion", async () => {
  await seedUser();
  db.beforeBatch = async () => {
    db.beforeBatch = null;
    await deleteAccountData(email);
  };
  await assert.rejects(acceptTerms({ email }, "en", CURRENT_LEGAL_BUNDLE_VERSION));
  assert.equal(db.sqlite.prepare("SELECT count(*) AS count FROM users").get().count, 0);
  assert.equal(db.sqlite.prepare("SELECT count(*) AS count FROM legal_acceptances").get().count, 0);
  assert.equal(db.sqlite.prepare("SELECT count(*) AS count FROM audit_events WHERE event_code = 'legal.accepted'").get().count, 0);
});

test("failed data deletion does not record successful deletion or erase linked data", async () => {
  const id = await seedUser();
  await seedLegacySnapshot(id);
  db.sqlite.exec("CREATE TRIGGER reject_deletion BEFORE DELETE ON users BEGIN SELECT RAISE(ABORT, 'injected_delete_failure'); END;");
  await assert.rejects(deleteAccountData(email));
  assert.equal(db.sqlite.prepare("SELECT count(*) AS count FROM workspace_snapshots").get().count, 1);
  assert.equal(db.sqlite.prepare("SELECT count(*) AS count FROM audit_events WHERE event_code = 'privacy.deleted'").get().count, 0);
  db.sqlite.exec("DROP TRIGGER reject_deletion");
  assert.equal((await deleteAccountData(email)).deleted, true);
  assert.equal(db.sqlite.prepare("SELECT count(*) AS count FROM workspace_snapshots").get().count, 0);
  assert.equal(db.sqlite.prepare("SELECT count(*) AS count FROM audit_events WHERE event_code = 'privacy.deleted'").get().count, 1);
});

test("account deletion follows a legacy identity migration during access revocation", async () => {
  const legacyId = await seedUser(email, true);
  await seedLegacySnapshot(legacyId);
  globalThis.__tklabsCloudflareEnv.CLODEX_ACCESS = { getByName: () => ({
    getStatus: async () => ({ hasGrant: true }),
    revoke: async () => {
      await getTermsConsentStatus({ email });
      return { revoked: true };
    },
  }) };
  assert.equal((await deleteAccountData(email)).deleted, true);
  assert.equal(db.sqlite.prepare("SELECT count(*) AS count FROM users").get().count, 0);
  assert.equal(db.sqlite.prepare("SELECT count(*) AS count FROM workspace_snapshots").get().count, 0);
  assert.equal(db.sqlite.prepare("SELECT user_id FROM audit_events WHERE event_code = 'privacy.deleted'").get().user_id, await termsUserId(email));
});

test("sync cap measures UTF-8 and accounts for D1 ciphertext expansion", async () => {
  const payload = JSON.stringify({ text: "я".repeat(750_000) });
  assert.ok(payload.length < 1_800_000);
  await assert.rejects(putWorkspaceSnapshot(email, payload, 0), /workspace_sync_payload_too_large/);
  const acceptedPayload = JSON.stringify({ text: "x".repeat(MAX_WORKSPACE_SYNC_PAYLOAD_BYTES - 11) });
  await putWorkspaceSnapshot(email, acceptedPayload, 0);
  const stored = db.sqlite.prepare("SELECT length(ciphertext) AS bytes FROM workspace_snapshots").get();
  assert.ok(stored.bytes + 1_000 < 2_000_000);
  assert.equal((await getWorkspaceSnapshot(email)).payload, acceptedPayload);
});

test("oversized UTF-8 sync uploads return 413 before database work", async () => {
  globalThis.__tklabsAuth = async () => ({ user: { email } });
  const { PUT } = await import("../app/api/account/workspace-sync/route.ts");
  const response = await PUT(new Request("https://tklabs.uk/api/account/workspace-sync", {
    method: "PUT",
    headers: { origin: "https://tklabs.uk", "content-type": "application/json" },
    body: JSON.stringify({ payload: JSON.stringify({ text: "я".repeat(750_000) }), expectedRevision: 0 }),
  }));
  assert.equal(response.status, 413);
  assert.equal(db.sqlite.prepare("SELECT count(*) AS count FROM users").get().count, 0);
});

test("local privacy export and erasure include personal memory without silently syncing it", () => {
  const data = new Map([[PERSONAL_MEMORY_STORAGE_KEY, '{"entries":[]}'], ["tklab.archive.v1", "[]"], ["unrelated-secret", "keep"]]);
  const storage = { get length() { return data.size; }, key: (index) => [...data.keys()][index], getItem: (key) => data.get(key) ?? null, removeItem: (key) => data.delete(key) };
  assert.equal(JSON.parse(collectLocalWorkspaceSnapshot(storage)).values[PERSONAL_MEMORY_STORAGE_KEY], '{"entries":[]}');
  assert.equal(collectWorkspaceVaultEntries(storage)[PERSONAL_MEMORY_STORAGE_KEY], '{"entries":[]}');
  assert.equal(JSON.parse(collectWorkspaceSnapshot(storage)).values[PERSONAL_MEMORY_STORAGE_KEY], undefined);
  assert.equal(clearLocalWorkspace(storage), 2);
  assert.equal(storage.getItem(PERSONAL_MEMORY_STORAGE_KEY), null);
  assert.equal(storage.getItem("unrelated-secret"), "keep");
});
