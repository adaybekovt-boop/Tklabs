import { and, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { users, workspaceSnapshots } from "@/db/schema";
import { termsUserId } from "@/lib/terms-user-id";

const MAX_SYNC_PAYLOAD_CHARACTERS = 1_800_000;
export const WORKSPACE_SYNC_KEY_VERSION = 2;
const textEncoder = new TextEncoder();

export class WorkspaceSyncUnavailableError extends Error { constructor() { super("Workspace sync storage or encryption is unavailable."); this.name = "WorkspaceSyncUnavailableError"; } }
export class WorkspaceSyncConflictError extends Error { readonly revision: number; constructor(revision: number) { super("Workspace snapshot revision changed."); this.name = "WorkspaceSyncConflictError"; this.revision = revision; } }

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

async function hkdfBaseKey(version: number) { return crypto.subtle.importKey("raw", textEncoder.encode(secretForVersion(version)), "HKDF", false, ["deriveKey"]); }
async function hkdfSalt() { return sha256("TK LAB Workspace Sync HKDF salt v2"); }
async function deriveEncryptionKey(email: string, version: number) {
  return crypto.subtle.deriveKey({ name: "HKDF", hash: "SHA-256", salt: await hkdfSalt(), info: textEncoder.encode(`encryption\n${normalizeEmail(email)}\nv${version}`) }, await hkdfBaseKey(version), { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}
async function deriveIntegrityKey(email: string, version: number) {
  return crypto.subtle.deriveKey({ name: "HKDF", hash: "SHA-256", salt: await hkdfSalt(), info: textEncoder.encode(`integrity\n${normalizeEmail(email)}\nv${version}`) }, await hkdfBaseKey(version), { name: "HMAC", hash: "SHA-256", length: 256 }, false, ["sign"]);
}
function aad(email: string, revision: number, version: number) { return textEncoder.encode(`TKLAB|workspace-sync|user=${normalizeEmail(email)}|revision=${revision}|key=v${version}`); }
async function integrityId(email: string, version: number, revision: number, iv: Uint8Array, ciphertext: Uint8Array) {
  const authData = aad(email, revision, version);
  const combined = new Uint8Array(authData.length + iv.length + ciphertext.length);
  combined.set(authData); combined.set(iv, authData.length); combined.set(ciphertext, authData.length + iv.length);
  return bytesToHex(new Uint8Array(await crypto.subtle.sign("HMAC", await deriveIntegrityKey(email, version), combined)));
}
async function sealV2(email: string, payload: string, revision: number) {
  const version = WORKSPACE_SYNC_KEY_VERSION;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: aad(email, revision, version) }, await deriveEncryptionKey(email, version), textEncoder.encode(payload)));
  return { ciphertext: bytesToBase64(encrypted), iv: bytesToBase64(iv), checksum: await integrityId(email, version, revision, iv, encrypted), keyVersion: version };
}
async function openV2(email: string, row: { ciphertext: string; iv: string; checksum: string; keyVersion: number; revision: number }) {
  const iv = base64ToBytes(row.iv); const ciphertext = base64ToBytes(row.ciphertext);
  const expected = await integrityId(email, row.keyVersion, row.revision, iv, ciphertext);
  if (expected !== row.checksum) throw new WorkspaceSyncUnavailableError();
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv, additionalData: aad(email, row.revision, row.keyVersion) }, await deriveEncryptionKey(email, row.keyVersion), ciphertext);
  return new TextDecoder().decode(decrypted);
}

async function ensureUserId(emailValue: string) {
  const email = normalizeEmail(emailValue); if (!email) throw new WorkspaceSyncUnavailableError();
  const db = getDb(); const now = new Date(); const id = await termsUserId(email);
  await db.insert(users).values({ id, email, createdAt: now, updatedAt: now }).onConflictDoUpdate({ target: users.email, set: { updatedAt: now } }).run();
  const row = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).get();
  if (!row?.id) throw new WorkspaceSyncUnavailableError();
  return { db, id: row.id, email };
}

export async function getWorkspaceSnapshot(email: string) {
  try {
    const { db, id, email: normalized } = await ensureUserId(email);
    const row = await db.select().from(workspaceSnapshots).where(eq(workspaceSnapshots.userId, id)).get();
    if (!row) return null;
    let payload: string;
    let checksum = row.checksum;
    let keyVersion = row.keyVersion ?? 1;
    if (keyVersion === 1) {
      payload = await legacyDecrypt(normalized, row.ciphertext, row.iv);
      if ((await legacyChecksum(payload)) !== row.checksum) throw new WorkspaceSyncUnavailableError();
      const resealed = await sealV2(normalized, payload, row.revision);
      await db.update(workspaceSnapshots).set({ ...resealed, updatedAt: row.updatedAt }).where(eq(workspaceSnapshots.userId, id)).run();
      checksum = resealed.checksum; keyVersion = resealed.keyVersion;
    } else if (keyVersion === WORKSPACE_SYNC_KEY_VERSION) {
      payload = await openV2(normalized, { ...row, keyVersion });
    } else { throw new WorkspaceSyncUnavailableError(); }
    return { payload, revision: row.revision, checksum, keyVersion, updatedAt: row.updatedAt.toISOString() };
  } catch (error) { if (error instanceof WorkspaceSyncUnavailableError) throw error; console.error("Unable to read workspace sync snapshot", error); throw new WorkspaceSyncUnavailableError(); }
}

export async function putWorkspaceSnapshot(email: string, payload: string, expectedRevision: number | null) {
  if (!payload || Array.from(payload).length > MAX_SYNC_PAYLOAD_CHARACTERS) throw new Error("workspace_sync_payload_too_large");
  try {
    const { db, id, email: normalized } = await ensureUserId(email);
    const existing = await db.select().from(workspaceSnapshots).where(eq(workspaceSnapshots.userId, id)).get();
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
        .values({ userId: id, ...sealed, revision, updatedAt })
        .onConflictDoNothing()
        .run();
      const changes = Number((result as { meta?: { changes?: number } }).meta?.changes ?? 0);
      if (changes !== 1) {
        const latest = await db.select({ revision: workspaceSnapshots.revision }).from(workspaceSnapshots).where(eq(workspaceSnapshots.userId, id)).get();
        throw new WorkspaceSyncConflictError(latest?.revision ?? 1);
      }
    }
    return { revision, checksum: sealed.checksum, keyVersion: sealed.keyVersion, updatedAt: updatedAt.toISOString() };
  } catch (error) { if (error instanceof WorkspaceSyncConflictError || error instanceof WorkspaceSyncUnavailableError) throw error; if (error instanceof Error && error.message === "workspace_sync_payload_too_large") throw error; console.error("Unable to write workspace sync snapshot", error); throw new WorkspaceSyncUnavailableError(); }
}

export async function deleteWorkspaceSnapshot(email: string) {
  try { const normalized = normalizeEmail(email); if (!normalized) throw new WorkspaceSyncUnavailableError(); const db = getDb(); const row = await db.select({ id: users.id }).from(users).where(eq(users.email, normalized)).get(); if (!row?.id) return { deleted: false }; await db.delete(workspaceSnapshots).where(eq(workspaceSnapshots.userId, row.id)).run(); return { deleted: true }; }
  catch (error) { if (error instanceof WorkspaceSyncUnavailableError) throw error; console.error("Unable to delete workspace sync snapshot", error); throw new WorkspaceSyncUnavailableError(); }
}
