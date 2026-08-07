export const WORKSPACE_VAULT_SCHEMA_VERSION = 1 as const;
export const WORKSPACE_VAULT_MAX_BYTES = 5_000_000;

const EXACT_STORAGE_KEYS = new Set([
  "tklab.archive.v1",
  "tklab.settings.v1",
  "tklab-locale",
  "tklabs-theme",
  "tklabs.response-mode",
  "tklabs.pwa-install-dismissed.v1",
  "tklabs.workspace-artifacts.v1",
  "tklabs.erma-flow.runs.v1",
]);
const STORAGE_PREFIXES = ["tklabs.chat-draft.v1:"];
const MAX_ENTRY_BYTES = 1_600_000;

type VaultStorage = Pick<Storage, "length" | "key" | "getItem" | "setItem" | "removeItem">;

export type WorkspaceVaultEntries = Record<string, string>;
export type WorkspaceVaultBundle = {
  schemaVersion: typeof WORKSPACE_VAULT_SCHEMA_VERSION;
  appVersion: string;
  exportedAt: string;
  entries: WorkspaceVaultEntries;
  digest: string;
};
export type WorkspaceVaultImportMode = "merge" | "replace";
export type WorkspaceVaultSummary = {
  conversations: number;
  drafts: number;
  artifacts: number;
  flowRuns: number;
  settings: number;
  bytes: number;
};

type UnsignedWorkspaceVaultBundle = Omit<WorkspaceVaultBundle, "digest">;

function browserStorage(): VaultStorage | null {
  return typeof window === "undefined" ? null : window.localStorage;
}

function utf8Bytes(value: string) {
  return new TextEncoder().encode(value).byteLength;
}

function cleanAppVersion(value: unknown) {
  return typeof value === "string" && /^v?\d+\.\d+\.\d+(?:[-+][\w.-]+)?$/.test(value.trim())
    ? value.trim().slice(0, 40)
    : "unknown";
}

function normalizeEntries(value: unknown): WorkspaceVaultEntries {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid vault entries.");
  const entries: WorkspaceVaultEntries = {};
  let totalBytes = 0;
  for (const [key, entry] of Object.entries(value)) {
    if (!isWorkspaceVaultKey(key) || typeof entry !== "string") throw new Error(`Unsupported vault entry: ${key}`);
    const entryBytes = utf8Bytes(entry);
    if (entryBytes > MAX_ENTRY_BYTES) throw new Error(`Vault entry is too large: ${key}`);
    totalBytes += utf8Bytes(key) + entryBytes;
    if (totalBytes > WORKSPACE_VAULT_MAX_BYTES) throw new Error("Workspace Vault exceeds the maximum supported size.");
    entries[key] = entry;
  }
  return sortEntries(entries);
}

function sortEntries(entries: WorkspaceVaultEntries) {
  return Object.fromEntries(Object.entries(entries).sort(([left], [right]) => left.localeCompare(right)));
}

function unsignedPayload(bundle: UnsignedWorkspaceVaultBundle) {
  return JSON.stringify({
    schemaVersion: bundle.schemaVersion,
    appVersion: bundle.appVersion,
    exportedAt: bundle.exportedAt,
    entries: sortEntries(bundle.entries),
  });
}

async function sha256(value: string) {
  if (!globalThis.crypto?.subtle) throw new Error("SHA-256 is unavailable in this browser.");
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function countArray(raw: string | undefined) {
  if (!raw) return 0;
  try {
    const value = JSON.parse(raw) as unknown;
    return Array.isArray(value) ? value.length : 0;
  } catch {
    return 0;
  }
}

export function isWorkspaceVaultKey(key: string) {
  return EXACT_STORAGE_KEYS.has(key) || STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix));
}

export function collectWorkspaceVaultEntries(storage: VaultStorage | null = browserStorage()) {
  const entries: WorkspaceVaultEntries = {};
  if (!storage) return entries;
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (!key || !isWorkspaceVaultKey(key)) continue;
    const value = storage.getItem(key);
    if (value !== null) entries[key] = value;
  }
  return sortEntries(entries);
}

export function summarizeWorkspaceVault(entries: WorkspaceVaultEntries): WorkspaceVaultSummary {
  const drafts = Object.keys(entries).filter((key) => key.startsWith("tklabs.chat-draft.v1:")).length;
  const settings = Object.keys(entries).filter((key) => ![
    "tklab.archive.v1",
    "tklabs.workspace-artifacts.v1",
    "tklabs.erma-flow.runs.v1",
  ].includes(key) && !key.startsWith("tklabs.chat-draft.v1:")).length;
  return {
    conversations: countArray(entries["tklab.archive.v1"]),
    drafts,
    artifacts: countArray(entries["tklabs.workspace-artifacts.v1"]),
    flowRuns: countArray(entries["tklabs.erma-flow.runs.v1"]),
    settings,
    bytes: utf8Bytes(JSON.stringify(entries)),
  };
}

export async function createWorkspaceVault(
  appVersion: string,
  storage: VaultStorage | null = browserStorage(),
): Promise<WorkspaceVaultBundle> {
  const unsigned: UnsignedWorkspaceVaultBundle = {
    schemaVersion: WORKSPACE_VAULT_SCHEMA_VERSION,
    appVersion: cleanAppVersion(appVersion),
    exportedAt: new Date().toISOString(),
    entries: collectWorkspaceVaultEntries(storage),
  };
  return { ...unsigned, digest: await sha256(unsignedPayload(unsigned)) };
}

export async function parseWorkspaceVault(serialized: string): Promise<WorkspaceVaultBundle> {
  if (utf8Bytes(serialized) > WORKSPACE_VAULT_MAX_BYTES) throw new Error("Workspace Vault file is too large.");
  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized);
  } catch {
    throw new Error("Workspace Vault is not valid JSON.");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Workspace Vault has an invalid structure.");
  const candidate = parsed as Partial<WorkspaceVaultBundle>;
  if (candidate.schemaVersion !== WORKSPACE_VAULT_SCHEMA_VERSION) throw new Error("Unsupported Workspace Vault version.");
  if (typeof candidate.exportedAt !== "string" || !Number.isFinite(Date.parse(candidate.exportedAt))) throw new Error("Workspace Vault export date is invalid.");
  if (typeof candidate.digest !== "string" || !/^[a-f0-9]{64}$/i.test(candidate.digest)) throw new Error("Workspace Vault digest is missing or invalid.");
  const unsigned: UnsignedWorkspaceVaultBundle = {
    schemaVersion: WORKSPACE_VAULT_SCHEMA_VERSION,
    appVersion: cleanAppVersion(candidate.appVersion),
    exportedAt: candidate.exportedAt,
    entries: normalizeEntries(candidate.entries),
  };
  const digest = await sha256(unsignedPayload(unsigned));
  if (digest.toLowerCase() !== candidate.digest.toLowerCase()) throw new Error("Workspace Vault integrity check failed.");
  return { ...unsigned, digest };
}

export function applyWorkspaceVault(
  bundle: WorkspaceVaultBundle,
  mode: WorkspaceVaultImportMode,
  storage: VaultStorage | null = browserStorage(),
) {
  if (!storage) throw new Error("Browser storage is unavailable.");
  if (mode === "replace") {
    const currentKeys: string[] = [];
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key && isWorkspaceVaultKey(key)) currentKeys.push(key);
    }
    currentKeys.forEach((key) => storage.removeItem(key));
  }
  Object.entries(bundle.entries).forEach(([key, value]) => storage.setItem(key, value));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("tklab:archive-updated"));
    window.dispatchEvent(new Event("tklabs:flow-runs-updated"));
    window.dispatchEvent(new Event("tklabs:workspace-vault-imported"));
  }
}

export function workspaceVaultFilename(exportedAt = new Date()) {
  return `tklabs-workspace-vault-${exportedAt.toISOString().slice(0, 10)}.json`;
}
