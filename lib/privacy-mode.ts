export type WorkspacePrivacyMode = "local" | "synced" | "ephemeral";

export const WORKSPACE_PRIVACY_MODE_KEY = "tklabs.privacy-mode.v1";
export const WORKSPACE_PRIVACY_MODE_EVENT = "tklabs:privacy-mode-changed";

export function isWorkspacePrivacyMode(value: unknown): value is WorkspacePrivacyMode {
  return value === "local" || value === "synced" || value === "ephemeral";
}

export function getWorkspacePrivacyMode(storage?: Pick<Storage, "getItem">): WorkspacePrivacyMode {
  if (!storage && typeof window === "undefined") return "local";
  const source = storage ?? window.localStorage;
  try {
    const value = source.getItem(WORKSPACE_PRIVACY_MODE_KEY);
    return isWorkspacePrivacyMode(value) ? value : "local";
  } catch {
    return "local";
  }
}

export function setWorkspacePrivacyMode(mode: WorkspacePrivacyMode, storage?: Pick<Storage, "setItem">) {
  const target = storage ?? (typeof window === "undefined" ? null : window.localStorage);
  if (!target) return;
  target.setItem(WORKSPACE_PRIVACY_MODE_KEY, mode);
  if (typeof window !== "undefined") window.dispatchEvent(new Event(WORKSPACE_PRIVACY_MODE_EVENT));
}

export function shouldPersistWorkspace(mode: WorkspacePrivacyMode = getWorkspacePrivacyMode()) {
  return mode !== "ephemeral";
}

export function privacyModeRoute(mode: WorkspacePrivacyMode) {
  if (mode === "synced") return ["Device", "TK LAB Worker", "External model provider", "D1 encrypted snapshot"] as const;
  return ["Device", "TK LAB Worker", "External model provider"] as const;
}
