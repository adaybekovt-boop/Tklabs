import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { users, workspaceSnapshots } from "@/db/schema";
import { termsUserId } from "@/lib/terms-user-id";

const MAX_SYNC_PAYLOAD_CHARACTERS = 1_800_000;

export class WorkspaceSyncUnavailableError extends Error {
  constructor() { super("Workspace sync storage or encryption is unavailable."); this.name = "WorkspaceSyncUnavailableError"; }
}

export class WorkspaceSyncConflictError extends Error {
  readonly revision: number;
  constructor(revision: number) { super("Workspace snapshot revision changed."); this.name = "WorkspaceSyncConflictError"; this.revision = revision; }
}

function normalizeEmail(email: string) { return email.trim().toLowerCase(); }

function secret() {
  const value = process.env.WORKSPACE_SYNC_SECRET?.trim() ?? "";
  if (value.length < 32) throw new WorkspaceSyncUnavailableError();
  return value;
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  return btoa(binary);
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

async function deriveKey(email: string) {
  const material = new TextEncoder().encode(`${secret()}\n${normalizeEmail(email)}`);
  const digest = await crypto.subtle.digest("SHA-256", material);
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

async function checksum(payload: string) {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload)));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function encryptPayload(email: string, payload: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await deriveKey(email), new TextEncoder().encode(payload));
  return { ciphertext: bytesToBase64(new Uint8Array(encrypted)), iv: bytesToBase64(iv), checksum: await checksum(payload) };
}

async function decryptPayload(email: string, ciphertext: string, iv: string) {
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: base64ToBytes(iv) }, await deriveKey(email), base64ToBytes(ciphertext));
  return new TextDecoder().decode(decrypted);
}

async function ensureUserId(emailValue: string) {
  const email = normalizeEmail(emailValue);
  if (!email) throw new WorkspaceSyncUnavailableError();
  const db = getDb();
  const now = new Date();
  const id = await termsUserId(email);
  await db.insert(users).values({ id, email, createdAt: now, updatedAt: now }).onConflictDoUpdate({ target: users.email, set: { updatedAt: now } }).run();
  const row = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).get();
  if (!row?.id) throw new WorkspaceSyncUnavailableError();
  return { db, id: row.id, email };
}

export async function getWorkspaceSnapshot(email: string) {
  try {
    const { db, id, email: normalized } = await ensureUserId(email);
    secret();
    const row = await db.select().from(workspaceSnapshots).where(eq(workspaceSnapshots.userId, id)).get();
    if (!row) return null;
    const payload = await decryptPayload(normalized, row.ciphertext, row.iv);
    if ((await checksum(payload)) !== row.checksum) throw new WorkspaceSyncUnavailableError();
    return { payload, revision: row.revision, checksum: row.checksum, updatedAt: row.updatedAt.toISOString() };
  } catch (error) {
    if (error instanceof WorkspaceSyncUnavailableError) throw error;
    console.error("Unable to read workspace sync snapshot", error);
    throw new WorkspaceSyncUnavailableError();
  }
}

export async function putWorkspaceSnapshot(email: string, payload: string, expectedRevision: number | null) {
  if (!payload || Array.from(payload).length > MAX_SYNC_PAYLOAD_CHARACTERS) throw new Error("workspace_sync_payload_too_large");
  try {
    const { db, id, email: normalized } = await ensureUserId(email);
    const existing = await db.select().from(workspaceSnapshots).where(eq(workspaceSnapshots.userId, id)).get();
    const currentRevision = existing?.revision ?? 0;
    if (expectedRevision !== null && expectedRevision !== currentRevision) throw new WorkspaceSyncConflictError(currentRevision);
    const sealed = await encryptPayload(normalized, payload);
    const revision = currentRevision + 1;
    const updatedAt = new Date();
    await db.insert(workspaceSnapshots).values({ userId: id, ...sealed, revision, updatedAt }).onConflictDoUpdate({ target: workspaceSnapshots.userId, set: { ...sealed, revision, updatedAt } }).run();
    return { revision, checksum: sealed.checksum, updatedAt: updatedAt.toISOString() };
  } catch (error) {
    if (error instanceof WorkspaceSyncConflictError) throw error;
    if (error instanceof WorkspaceSyncUnavailableError) throw error;
    if (error instanceof Error && error.message === "workspace_sync_payload_too_large") throw error;
    console.error("Unable to write workspace sync snapshot", error);
    throw new WorkspaceSyncUnavailableError();
  }
}

export async function deleteWorkspaceSnapshot(email: string) {
  try {
    const normalized = normalizeEmail(email);
    if (!normalized) throw new WorkspaceSyncUnavailableError();
    const db = getDb();
    const row = await db.select({ id: users.id }).from(users).where(eq(users.email, normalized)).get();
    if (!row?.id) return { deleted: false };
    await db.delete(workspaceSnapshots).where(eq(workspaceSnapshots.userId, row.id)).run();
    return { deleted: true };
  } catch (error) {
    if (error instanceof WorkspaceSyncUnavailableError) throw error;
    console.error("Unable to delete workspace sync snapshot", error);
    throw new WorkspaceSyncUnavailableError();
  }
}
