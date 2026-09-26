"use client";

import { getWorkspacePrivacyMode, shouldPersistWorkspace } from "@/lib/privacy-mode";
import type { WorkspaceRun } from "./run";

export const WORKSPACE_RUNS_KEY = "tklabs.workspace-runs.v1";
export const WORKSPACE_RUNS_EVENT = "tklabs:workspace-runs-updated";
export const MAX_WORKSPACE_RUN_BYTES = 500_000;
let cache: WorkspaceRun[] | null = null;

function safeRun(value: unknown): WorkspaceRun | null {
  if (!value || typeof value !== "object") return null;
  const entry = value as Partial<WorkspaceRun>;
  if (typeof entry.id !== "string" || typeof entry.sessionId !== "string" || typeof entry.assistantMessageId !== "string" || typeof entry.intent !== "string" || typeof entry.createdAt !== "number") return null;
  if (!Array.isArray(entry.steps) || !Array.isArray(entry.toolCalls) || !Array.isArray(entry.artifactIds)) return null;
  const status = ["understanding", "planning", "executing", "reviewing"].includes(entry.status ?? "") ? "paused" : entry.status;
  return { ...entry, id: entry.id.slice(0, 120), sessionId: entry.sessionId.slice(0, 120), assistantMessageId: entry.assistantMessageId.slice(0, 120), intent: entry.intent.slice(0, 2000), title: (entry.title ?? entry.intent).slice(0, 120), mode: entry.mode === "task" || entry.mode === "artifact" ? entry.mode : "ask", model: (entry.model ?? "erma-auto").slice(0, 120), status: status === "completed" || status === "failed" || status === "cancelled" ? status : "paused", updatedAt: Number.isFinite(entry.updatedAt) ? entry.updatedAt! : entry.createdAt, createdAt: entry.createdAt, sequence: Number.isInteger(entry.sequence) ? entry.sequence! : -1, steps: entry.steps.slice(-12), toolCalls: entry.toolCalls.slice(-20), sources: Array.isArray(entry.sources) ? entry.sources.slice(-20) : [], artifactIds: entry.artifactIds.filter((id): id is string => typeof id === "string").slice(-10), ...(typeof entry.requestId === "string" ? { requestId: entry.requestId.slice(0, 120) } : {}), ...(typeof entry.error === "string" ? { error: entry.error.slice(0, 240) } : {}) };
}

export function invalidateWorkspaceRuns() { cache = null; if (typeof window !== "undefined") window.dispatchEvent(new Event(WORKSPACE_RUNS_EVENT)); }
export function loadWorkspaceRuns(): WorkspaceRun[] {
  if (cache) return cache;
  if (typeof window === "undefined") return [];
  if (!shouldPersistWorkspace(getWorkspacePrivacyMode())) return cache = [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(WORKSPACE_RUNS_KEY) ?? "[]");
    cache = Array.isArray(parsed) ? parsed.map(safeRun).filter((run): run is WorkspaceRun => Boolean(run)).slice(0, 40) : [];
  } catch { cache = []; }
  return cache;
}

export function upsertWorkspaceRun(run: WorkspaceRun) {
  const next = [run, ...loadWorkspaceRuns().filter((entry) => entry.id !== run.id)].slice(0, 40);
  cache = next;
  if (typeof window !== "undefined") {
    if (shouldPersistWorkspace(getWorkspacePrivacyMode())) {
      while (next.length && new TextEncoder().encode(JSON.stringify(next)).length > MAX_WORKSPACE_RUN_BYTES) next.pop();
      try { window.localStorage.setItem(WORKSPACE_RUNS_KEY, JSON.stringify(next)); } catch { /* Storage may be unavailable. */ }
    }
    window.dispatchEvent(new Event(WORKSPACE_RUNS_EVENT));
  }
}

export function attachArtifactToWorkspaceRun(runId: string, artifactId: string) {
  const run = loadWorkspaceRuns().find((entry) => entry.id === runId);
  if (run && !run.artifactIds.includes(artifactId)) upsertWorkspaceRun({ ...run, artifactIds: [...run.artifactIds, artifactId] });
}

export function subscribeWorkspaceRuns(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const reset = () => { cache = null; callback(); };
  window.addEventListener(WORKSPACE_RUNS_EVENT, callback);
  window.addEventListener("tklabs:workspace-data-replaced", reset);
  window.addEventListener("tklabs:privacy-mode-changed", reset);
  return () => { window.removeEventListener(WORKSPACE_RUNS_EVENT, callback); window.removeEventListener("tklabs:workspace-data-replaced", reset); window.removeEventListener("tklabs:privacy-mode-changed", reset); };
}
