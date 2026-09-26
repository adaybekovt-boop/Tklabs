import type { AiResponseMeta, AiToolCallTrace } from "@/lib/ai/types";
import type { AgentRunEvent, AgentRunReference, AgentRunStep } from "@/lib/ai/agent-run";

export type WorkspaceMode = "ask" | "task" | "artifact";
export type WorkspaceStatus = "understanding" | "planning" | "executing" | "reviewing" | "completed" | "failed" | "cancelled" | "paused";
export type WorkspaceRun = {
  id: string;
  sessionId: string;
  assistantMessageId: string;
  intent: string;
  title: string;
  mode: WorkspaceMode;
  model: string;
  status: WorkspaceStatus;
  createdAt: number;
  updatedAt: number;
  remoteRunId?: string;
  sequence: number;
  requestId?: string;
  steps: AgentRunStep[];
  toolCalls: AiToolCallTrace[];
  sources: AgentRunReference[];
  artifactIds: string[];
  error?: string;
};

export function createWorkspaceRun(input: Pick<WorkspaceRun, "id" | "sessionId" | "assistantMessageId" | "intent" | "model" | "mode">, now = Date.now()): WorkspaceRun {
  return { ...input, title: input.intent.slice(0, 100), status: "understanding", createdAt: now, updatedAt: now, sequence: -1, steps: [], toolCalls: [], sources: [], artifactIds: [] };
}

export function updateWorkspaceRun(run: WorkspaceRun, patch: Partial<WorkspaceRun>, now = Date.now()): WorkspaceRun {
  if (["completed", "failed", "cancelled"].includes(run.status)) return run;
  return { ...run, ...patch, id: run.id, sessionId: run.sessionId, updatedAt: now };
}

export function applyWorkspaceRunEvent(run: WorkspaceRun, message: AgentRunEvent): WorkspaceRun {
  if (message.sequence <= run.sequence || (run.remoteRunId && message.runId !== run.remoteRunId)) return run;
  if (["completed", "failed", "cancelled"].includes(run.status)) return run;
  const payload = message.payload && typeof message.payload === "object" ? message.payload as Record<string, unknown> : {};
  const next = { ...run, remoteRunId: message.runId, sequence: message.sequence, updatedAt: message.timestamp };
  switch (message.event) {
    case "plan.created": return { ...next, status: "planning", steps: Array.isArray(payload.steps) ? payload.steps.filter((step): step is AgentRunStep => Boolean(step && typeof step === "object" && "id" in step && "title" in step)).slice(0, 8) : [] };
    case "tool.started": return { ...next, status: "executing", steps: typeof payload.id === "string" && typeof payload.name === "string" ? [...run.steps.filter((step) => step.id !== payload.id), { id: payload.id.slice(0, 120), title: payload.name.slice(0, 100), status: "running" as const, startedAt: message.timestamp }].slice(-12) : run.steps };
    case "tool.completed": return { ...next, status: "executing", steps: run.steps.map((step) => step.id === payload.id ? { ...step, status: payload.status === "success" ? "completed" as const : "failed" as const, completedAt: message.timestamp } : step), toolCalls: typeof payload.id === "string" ? [...run.toolCalls.filter((call) => call.id !== payload.id), payload as unknown as AiToolCallTrace].slice(-20) : run.toolCalls };
    case "reference.added": return { ...next, sources: payload.reference && typeof payload.reference === "object" ? [...run.sources, payload.reference as AgentRunReference].slice(-20) : run.sources };
    case "run.completed": return { ...next, status: "completed" };
    case "run.failed": return { ...next, status: "failed", error: typeof payload.error === "string" ? payload.error.slice(0, 240) : undefined };
    case "run.cancelled": return { ...next, status: "cancelled" };
    case "answer.delta": return { ...next, status: "executing" };
    case "run.status": return { ...next, status: payload.status === "using_tools" ? "planning" : "executing" };
    default: return next;
  }
}

export function workspaceRunWithMeta(run: WorkspaceRun, meta: AiResponseMeta): WorkspaceRun {
  return { ...run, requestId: meta.requestId, toolCalls: meta.toolCalls?.slice(-20) ?? run.toolCalls, updatedAt: Date.now() };
}
