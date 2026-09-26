"use client";

import { getWorkspacePrivacyMode } from "@/lib/privacy-mode";
import { PERSONAL_MEMORY_STORAGE_KEY } from "@/lib/ai/personal-memory";
import { MAX_WORKSPACE_SYNC_PAYLOAD_BYTES, workspaceSyncPayloadBytes } from "@/lib/workspace-sync-limits";

const SNAPSHOT_VERSION = 1 as const;
const DRAFT_PREFIX = "tklabs.chat-draft.v1:";
const EXACT_KEYS = new Set(["tklab.archive.v1", "tklab.settings.v1", "tklabs.workspace-artifacts.v1", "tklabs.erma-flow.runs.v1", "tklabs.response-mode", "tklabs.erma-nova.workspace-tab", "tklabs-theme"]);
export type LocalWorkspaceSnapshot = { version: typeof SNAPSHOT_VERSION; createdAt: number; values: Record<string, string> };
export type RemoteWorkspaceSnapshot = { payload: string; revision: number; checksum: string; updatedAt: string };
function allowedKey(key: string) { return EXACT_KEYS.has(key) || key.startsWith(DRAFT_PREFIX); }
function localWorkspaceKey(key: string) { return allowedKey(key) || key === PERSONAL_MEMORY_STORAGE_KEY; }

function collectSnapshot(storage: Storage, includeLocalMemory: boolean) {
  const values: Record<string, string> = {};
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (!key || !(includeLocalMemory ? localWorkspaceKey(key) : allowedKey(key))) continue;
    const value = storage.getItem(key);
    if (value != null) values[key] = value;
  }
  return JSON.stringify({ version: SNAPSHOT_VERSION, createdAt: Date.now(), values } satisfies LocalWorkspaceSnapshot);
}

export function collectWorkspaceSnapshot(storage: Storage = window.localStorage) {
  const payload = collectSnapshot(storage, false);
  if (workspaceSyncPayloadBytes(payload) > MAX_WORKSPACE_SYNC_PAYLOAD_BYTES) throw new Error("workspace_snapshot_too_large");
  return payload;
}

// Explicit local export includes personal memory without opting it into cloud sync.
export function collectLocalWorkspaceSnapshot(storage: Storage = window.localStorage) {
  return collectSnapshot(storage, true);
}
export function applyWorkspaceSnapshot(payload: string, storage: Storage = window.localStorage) { const parsed = JSON.parse(payload) as Partial<LocalWorkspaceSnapshot>; if (parsed.version !== SNAPSHOT_VERSION || !parsed.values || typeof parsed.values !== "object" || Array.isArray(parsed.values)) throw new Error("workspace_snapshot_invalid"); const entries = Object.entries(parsed.values); let total = 0; for (const [key, value] of entries) { if (!allowedKey(key) || typeof value !== "string") throw new Error("workspace_snapshot_invalid"); total += workspaceSyncPayloadBytes(key) + workspaceSyncPayloadBytes(value); if (total > MAX_WORKSPACE_SYNC_PAYLOAD_BYTES) throw new Error("workspace_snapshot_too_large"); } for (const [key, value] of entries) storage.setItem(key, value); return entries.length; }
export function clearLocalWorkspace(storage: Storage = window.localStorage) {
  const keys: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key && localWorkspaceKey(key)) keys.push(key);
  }
  for (const key of keys) storage.removeItem(key);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("tklabs:personal-memory"));
    window.dispatchEvent(new Event("tklab:archive-updated"));
    window.dispatchEvent(new Event("tklabs:flow-runs-updated"));
  }
  return keys.length;
}
export async function fetchRemoteWorkspaceSnapshot(): Promise<{ available: boolean; snapshot: RemoteWorkspaceSnapshot | null }> { const response = await fetch("/api/account/workspace-sync", { cache: "no-store" }); if (response.status === 503) return { available: false, snapshot: null }; if (!response.ok) throw new Error(`workspace_sync_read_${response.status}`); return response.json(); }
export async function uploadWorkspaceSnapshot(payload: string, expectedRevision: number | null) { if (getWorkspacePrivacyMode() === "ephemeral") throw new Error("workspace_sync_disabled_in_ephemeral_mode"); const response = await fetch("/api/account/workspace-sync", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ payload, expectedRevision }) }); if (response.status === 503) return { available: false, snapshot: null }; if (response.status === 409) throw new Error("workspace_sync_conflict"); if (!response.ok) throw new Error(`workspace_sync_write_${response.status}`); return response.json() as Promise<{ available: true; snapshot: Omit<RemoteWorkspaceSnapshot, "payload"> }>; }
export async function deleteRemoteWorkspaceSnapshot() { const response = await fetch("/api/account/workspace-sync", { method: "DELETE" }); if (response.status === 503) return { available: false, deleted: false }; if (!response.ok) throw new Error(`workspace_sync_delete_${response.status}`); return response.json() as Promise<{ available: true; deleted: boolean }>; }
