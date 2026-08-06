export type WorkspaceSection = "chat" | "flow" | "artifacts" | "runs";

export const WORKSPACE_SECTION_EVENT = "tklabs:workspace-section";

export function isWorkspaceSection(value: unknown): value is WorkspaceSection {
  return value === "chat" || value === "flow" || value === "artifacts" || value === "runs";
}

export function requestWorkspaceSection(section: WorkspaceSection) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<WorkspaceSection>(WORKSPACE_SECTION_EVENT, { detail: section }));
}
