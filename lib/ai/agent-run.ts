export const AGENT_RUN_PROTOCOL_VERSION = "2.0" as const;

export type AgentRunStatus = "idle" | "planning" | "running" | "completed" | "failed" | "cancelled";
export type AgentRunStepStatus = "pending" | "running" | "completed" | "failed" | "cancelled";

export const AGENT_RUN_EVENT_NAMES = [
  "run.started",
  "plan.created",
  "step.started",
  "step.completed",
  "tool.started",
  "tool.completed",
  "reference.added",
  "artifact.created",
  "artifact.delta",
  "artifact.versioned",
  "answer.delta",
  "run.completed",
  "run.failed",
  "run.cancelled",
] as const;

export type AgentRunEventName = typeof AGENT_RUN_EVENT_NAMES[number];

export interface AgentRunStep {
  id: string;
  title: string;
  status: AgentRunStepStatus;
  detail?: string;
  startedAt?: number;
  completedAt?: number;
}

export interface AgentRunReference {
  id: string;
  title: string;
  href?: string;
  sourceType: "internal" | "document" | "status" | "release" | "archive";
  snippet?: string;
}

export interface AgentRunState {
  protocolVersion: typeof AGENT_RUN_PROTOCOL_VERSION;
  id: string;
  status: AgentRunStatus;
  title: string;
  steps: AgentRunStep[];
  references: AgentRunReference[];
  artifactIds: string[];
  answer: string;
  error?: string;
  startedAt?: number;
  completedAt?: number;
}

export interface AgentRunEvent<T = unknown> {
  event: AgentRunEventName;
  runId: string;
  sequence: number;
  timestamp: number;
  payload: T;
}

export function createEmptyAgentRun(id = ""): AgentRunState {
  return {
    protocolVersion: AGENT_RUN_PROTOCOL_VERSION,
    id,
    status: "idle",
    title: "",
    steps: [],
    references: [],
    artifactIds: [],
    answer: "",
  };
}

function updateStep(state: AgentRunState, stepId: string, update: (step: AgentRunStep) => AgentRunStep) {
  return state.steps.map((step) => step.id === stepId ? update(step) : step);
}

export function applyAgentRunEvent(state: AgentRunState, message: AgentRunEvent): AgentRunState {
  const payload = message.payload && typeof message.payload === "object"
    ? message.payload as Record<string, unknown>
    : {};

  switch (message.event) {
    case "run.started":
      return {
        ...createEmptyAgentRun(message.runId),
        status: "planning",
        title: typeof payload.title === "string" ? payload.title : "Erma run",
        startedAt: message.timestamp,
      };
    case "plan.created": {
      const rawSteps = Array.isArray(payload.steps) ? payload.steps : [];
      const steps = rawSteps.slice(0, 6).flatMap((value, index) => {
        if (!value || typeof value !== "object") return [];
        const item = value as Record<string, unknown>;
        const title = typeof item.title === "string" ? item.title.trim() : "";
        if (!title) return [];
        return [{ id: typeof item.id === "string" ? item.id : `step-${index + 1}`, title, status: "pending" as const }];
      });
      return { ...state, id: message.runId, status: "running", steps };
    }
    case "step.started": {
      const stepId = typeof payload.stepId === "string" ? payload.stepId : "";
      return {
        ...state,
        status: "running",
        steps: updateStep(state, stepId, (step) => ({ ...step, status: "running", startedAt: message.timestamp })),
      };
    }
    case "step.completed": {
      const stepId = typeof payload.stepId === "string" ? payload.stepId : "";
      return {
        ...state,
        steps: updateStep(state, stepId, (step) => ({
          ...step,
          status: "completed",
          detail: typeof payload.detail === "string" ? payload.detail : step.detail,
          completedAt: message.timestamp,
        })),
      };
    }
    case "reference.added": {
      const reference = payload.reference;
      if (!reference || typeof reference !== "object") return state;
      const item = reference as Partial<AgentRunReference>;
      if (typeof item.id !== "string" || typeof item.title !== "string" || typeof item.sourceType !== "string") return state;
      if (state.references.some((current) => current.id === item.id)) return state;
      return { ...state, references: [...state.references, item as AgentRunReference].slice(-20) };
    }
    case "artifact.created": {
      const artifactId = typeof payload.artifactId === "string" ? payload.artifactId : "";
      return artifactId && !state.artifactIds.includes(artifactId)
        ? { ...state, artifactIds: [...state.artifactIds, artifactId].slice(-10) }
        : state;
    }
    case "answer.delta":
      return { ...state, status: "running", answer: `${state.answer}${typeof payload.text === "string" ? payload.text : ""}` };
    case "run.completed":
      return { ...state, status: "completed", completedAt: message.timestamp };
    case "run.failed":
      return {
        ...state,
        status: "failed",
        error: typeof payload.error === "string" ? payload.error : "The run could not be completed.",
        completedAt: message.timestamp,
      };
    case "run.cancelled":
      return {
        ...state,
        status: "cancelled",
        steps: state.steps.map((step) => step.status === "running" || step.status === "pending" ? { ...step, status: "cancelled" } : step),
        completedAt: message.timestamp,
      };
    case "tool.started":
    case "tool.completed":
    case "artifact.delta":
    case "artifact.versioned":
      return state;
  }
}

export function isAgentRunEvent(value: unknown): value is AgentRunEvent {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<AgentRunEvent>;
  return typeof candidate.event === "string"
    && AGENT_RUN_EVENT_NAMES.includes(candidate.event as AgentRunEventName)
    && typeof candidate.runId === "string"
    && candidate.runId.length > 0
    && typeof candidate.sequence === "number"
    && Number.isInteger(candidate.sequence)
    && candidate.sequence >= 0
    && typeof candidate.timestamp === "number"
    && Number.isFinite(candidate.timestamp);
}
