import { and, eq, sql } from "drizzle-orm";

import { getDb } from "@/db";
import { users, workspaceSnapshots } from "@/db/schema";
import { termsUserId } from "@/lib/terms-user-id";
import { MAX_WORKSPACE_SYNC_PAYLOAD_BYTES, workspaceSyncPayloadBytes } from "@/lib/workspace-sync-limits";

export const WORKSPACE_SYNC_KEY_VERSION = 2;
const textEncoder = new TextEncoder();

export class WorkspaceSyncUnavailableError extends Error { constructor() { super("Workspace sync storage or encryption is unavailable."); this.name = "WorkspaceSyncUnavailableError"; } }
export class WorkspaceSyncConflictError extends Error { readonly revision: number; constructor(revision: number) { super("Workspace snapshot revision changed."); this.name = "WorkspaceSyncConflictError"; this.revision = revision; } }
export class WorkspaceSyncRateLimitedError extends Error { constructor() { super("Workspace sync is writing too frequently."); this.name = "WorkspaceSyncRateLimitedError"; } }

// This endpoint has no per-request quota (unlike demo/tts, which reserve against the
// Clodex account Durable Object). It's a manual, button-triggered upload — real usage
// never approaches this — so a small per-user cooldown is enough to stop a scripted loop
// from turning it into unbounded paid D1 writes + AES-GCM work.
const MIN_MS_BETWEEN_WRITES = 2_000;

function normalizeEmail(email: string) { return email.trim().toLowerCase(); }
function secretForVersion(version: number) {
  const candidate = version === WORKSPACE_SYNC_KEY_VERSION ? (process.env.WORKSPACE_SYNC_SECRET_V2?.trim() || process.env.WORKSPACE_SYNC_SECRET?.trim() || "") : (process.env.WORKSPACE_SYNC_SECRET?.trim() || "");
  if (candidate.length < 32) throw new WorkspaceSyncUnavailableError();
  return candidate;
}
function bytesToBase64(bytes: Uint8Array) { let binary = ""; for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000)); return btoa(binary); }
function base64ToBytes(value: string) { const binary = atob(value); const bytes = new Uint8Array(binary.length); for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index); return bytes; }
function bytesToHex(bytes: Uint8Array) { return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(""); }
async function sha256(value: string) { return new Uint8Array(await crypto.subtle.digest("SHA-256", textEncoder.encode(value))); }

async function legacyKey(email: string) {
  const material = textEncoder.encode(`${secretForVersion(1)}\n${normalizeEmail(email)}`);
  const digest = await crypto.subtle.digest("SHA-256", material);
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["decrypt"]);
}
async function legacyChecksum(payload: string) { return bytesToHex(await sha256(payload)); }
async function legacyDecrypt(email: string, ciphertext: string, iv: string) { const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: base64ToBytes(iv) }, await legacyKey(email), base64ToBytes(ciphertext)); return new TextDecoder().decode(decrypted); }

async function hkdfBaseKey(secret: string) { return crypto.subtle.importKey("raw", textEncoder.encode(secret), "HKDF", false, ["deriveKey"]); }
async function hkdfSalt() { return sha256("TK LAB Workspace Sync HKDF salt v2"); }
async function deriveEncryptionKey(email: string, version: number, secret = secretForVersion(version)) {
  return crypto.subtle.deriveKey({ name: "HKDF", hash: "SHA-256", salt: await hkdfSalt(), info: textEncoder.encode(`encryption\n${normalizeEmail(email)}\nv${version}`) }, await hkdfBaseKey(secret), { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}
async function deriveIntegrityKey(email: string, version: number, secret = secretForVersion(version)) {
  return crypto.subtle.deriveKey({ name: "HKDF", hash: "SHA-256", salt: await hkdfSalt(), info: textEncoder.encode(`integrity\n${normalizeEmail(email)}\nv${version}`) }, await hkdfBaseKey(secret), { name: "HMAC", hash: "SHA-256", length: 256 }, false, ["sign"]);
}
function aad(email: string, revision: number, version: number) { return textEncoder.encode(`TKLAB|workspace-sync|user=${normalizeEmail(email)}|revision=${revision}|key=v${version}`); }
async function integrityId(email: string, version: number, revision: number, iv: Uint8Array, ciphertext: Uint8Array, secret = secretForVersion(version)) {
  const authData = aad(email, revision, version);
  const combined = new Uint8Array(authData.length + iv.length + ciphertext.length);
  combined.set(authData); combined.set(iv, authData.length); combined.set(ciphertext, authData.length + iv.length);
  return bytesToHex(new Uint8Array(await crypto.subtle.sign("HMAC", await deriveIntegrityKey(email, version, secret), combined)));
}
async function sealV2(email: string, payload: string, revision: number) {
  const version = WORKSPACE_SYNC_KEY_VERSION;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: aad(email, revision, version) }, await deriveEncryptionKey(email, version), textEncoder.encode(payload)));
  return { ciphertext: bytesToBase64(encrypted), iv: bytesToBase64(iv), checksum: await integrityId(email, version, revision, iv, encrypted), keyVersion: version };
}
async function openV2(email: string, row: { ciphertext: string; iv: string; checksum: string; keyVersion: number; revision: number }) {
  const iv = base64ToBytes(row.iv); const ciphertext = base64ToBytes(row.ciphertext);
  const currentSecret = secretForVersion(row.keyVersion);
  const previousSecret = process.env.WORKSPACE_SYNC_SECRET?.trim();
  // Before the dedicated V2 secret was configured, V2 writes used the original
  // secret. Keep those authenticated snapshots readable during that transition.
  const secrets = [currentSecret];
  if (previousSecret && previousSecret.length >= 32 && previousSecret !== currentSecret) secrets.push(previousSecret);
  for (const secret of secrets) {
    const expected = await integrityId(email, row.keyVersion, row.revision, iv, ciphertext, secret);
    if (expected !== row.checksum) continue;
    const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv, additionalData: aad(email, row.revision, row.keyVersion) }, await deriveEncryptionKey(email, row.keyVersion, secret), ciphertext);
    return { payload: new TextDecoder().decode(decrypted), needsReseal: secret !== currentSecret };
  }
  throw new WorkspaceSyncUnavailableError();
}

async function resolveUserId(emailValue: string, create: boolean) {
  const email = normalizeEmail(emailValue); if (!email) throw new WorkspaceSyncUnavailableError();
  const db = getDb();
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).get();
  if (existing) return { db, id: existing.id, email };
  if (!create) return null;
  if (!existing) {
    const id = await termsUserId(email);
    const now = new Date();
    await db.insert(users).values({ id, email, createdAt: now, updatedAt: now }).onConflictDoNothing().run();
  }
  const row = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).get();
  if (!row?.id) throw new WorkspaceSyncUnavailableError();
  return { db, id: row.id, email };
}

export async function getWorkspaceSnapshot(email: string) {
  try {
    const account = await resolveUserId(email, false);
    if (!account) return null;
    const { db, id, email: normalized } = account;
    const row = await db.select().from(workspaceSnapshots).where(eq(workspaceSnapshots.userId, id)).get();
    if (!row) return null;
    let payload: string;
    let checksum = row.checksum;
    let keyVersion = row.keyVersion ?? 1;
    let needsReseal = keyVersion === 1;
    if (keyVersion === 1) {
      payload = await legacyDecrypt(normalized, row.ciphertext, row.iv);
      if ((await legacyChecksum(payload)) !== row.checksum) throw new WorkspaceSyncUnavailableError();
    } else if (keyVersion === WORKSPACE_SYNC_KEY_VERSION) {
      const opened = await openV2(normalized, { ...row, keyVersion });
      payload = opened.payload; needsReseal = opened.needsReseal;
    } else { throw new WorkspaceSyncUnavailableError(); }
    if (needsReseal) {
      const resealed = await sealV2(normalized, payload, row.revision);
      // Encryption is asynchronous: a PUT may replace this snapshot while it
      // is being decrypted. Never overwrite a newer revision with ciphertext
      // authenticated for the old revision (that makes the backup unreadable).
      const result = await db.update(workspaceSnapshots)
        .set(resealed)
        .where(and(
          eq(workspaceSnapshots.userId, id),
          eq(workspaceSnapshots.revision, row.revision),
          eq(workspaceSnapshots.keyVersion, keyVersion),
          eq(workspaceSnapshots.checksum, row.checksum),
        ))
        .run();
      if (Number(result.meta.changes) === 1) {
        checksum = resealed.checksum; keyVersion = resealed.keyVersion;
      }
      // On a lost race, returning the snapshot we read is safe: its revision
      // remains stale, so the caller's next conditional PUT cannot overwrite
      // the concurrent update. Do not claim the migration was persisted.
    }
    return { payload, revision: row.revision, checksum, keyVersion, updatedAt: row.updatedAt.toISOString() };
  } catch (error) { if (error instanceof WorkspaceSyncUnavailableError) throw error; console.error("Unable to read workspace sync snapshot", error); throw new WorkspaceSyncUnavailableError(); }
}

export async function putWorkspaceSnapshot(email: string, payload: string, expectedRevision: number | null) {
  if (!payload || workspaceSyncPayloadBytes(payload) > MAX_WORKSPACE_SYNC_PAYLOAD_BYTES) throw new Error("workspace_sync_payload_too_large");
  try {
    const account = await resolveUserId(email, true);
    if (!account) throw new WorkspaceSyncUnavailableError();
    const { db, id, email: normalized } = account;
    const existing = await db.select().from(workspaceSnapshots).where(eq(workspaceSnapshots.userId, id)).get();
    if (existing && Date.now() - existing.updatedAt.getTime() < MIN_MS_BETWEEN_WRITES) throw new WorkspaceSyncRateLimitedError();
    const currentRevision = existing?.revision ?? 0;
    if (expectedRevision !== null && expectedRevision !== currentRevision) throw new WorkspaceSyncConflictError(currentRevision);
    const revision = currentRevision + 1; const sealed = await sealV2(normalized, payload, revision); const updatedAt = new Date();
    if (existing) {
      const result = await db.update(workspaceSnapshots)
        .set({ ...sealed, revision, updatedAt })
        .where(and(eq(workspaceSnapshots.userId, id), eq(workspaceSnapshots.revision, currentRevision)))
        .run();
      const changes = Number((result as { meta?: { changes?: number } }).meta?.changes ?? 0);
      if (changes !== 1) {
        const latest = await db.select({ revision: workspaceSnapshots.revision }).from(workspaceSnapshots).where(eq(workspaceSnapshots.userId, id)).get();
        throw new WorkspaceSyncConflictError(latest?.revision ?? currentRevision);
      }
    } else {
      const result = await db.insert(workspaceSnapshots)
        // The account can be deleted or its legacy ID migrated while sealing.
        // An insert scoped to the live user prevents an orphaned cloud backup.
        .select(db.select({
          userId: users.id,
          ciphertext: sql<string>`${sealed.ciphertext}`.as("ciphertext"),
          iv: sql<string>`${sealed.iv}`.as("iv"),
          checksum: sql<string>`${sealed.checksum}`.as("checksum"),
          keyVersion: sql<number>`${sealed.keyVersion}`.as("key_version"),
          revision: sql<number>`${revision}`.as("revision"),
          updatedAt: sql<Date>`${updatedAt.getTime()}`.as("updated_at"),
        }).from(users).where(eq(users.id, id)))
        .onConflictDoNothing()
        .run();
      const changes = Number((result as { meta?: { changes?: number } }).meta?.changes ?? 0);
      if (changes !== 1) {
        const latest = await db.select({ revision: workspaceSnapshots.revision }).from(workspaceSnapshots).where(eq(workspaceSnapshots.userId, id)).get();
        throw new WorkspaceSyncConflictError(latest?.revision ?? 1);
      }
    }
    return { revision, checksum: sealed.checksum, keyVersion: sealed.keyVersion, updatedAt: updatedAt.toISOString() };
  } catch (error) { if (error instanceof WorkspaceSyncConflictError || error instanceof WorkspaceSyncUnavailableError || error instanceof WorkspaceSyncRateLimitedError) throw error; if (error instanceof Error && error.message === "workspace_sync_payload_too_large") throw error; console.error("Unable to write workspace sync snapshot", error); throw new WorkspaceSyncUnavailableError(); }
}

export async function deleteWorkspaceSnapshot(email: string) {
  try { const normalized = normalizeEmail(email); if (!normalized) throw new WorkspaceSyncUnavailableError(); const db = getDb(); const row = await db.select({ id: users.id }).from(users).where(eq(users.email, normalized)).get(); if (!row?.id) return { deleted: false }; await db.delete(workspaceSnapshots).where(eq(workspaceSnapshots.userId, row.id)).run(); return { deleted: true }; }
  catch (error) { if (error instanceof WorkspaceSyncUnavailableError) throw error; console.error("Unable to delete workspace sync snapshot", error); throw new WorkspaceSyncUnavailableError(); }
}
