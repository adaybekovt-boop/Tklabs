export type FlowRunStatus = "planning" | "running" | "completed" | "stopped" | "failed";
export type FlowStepStatus = "pending" | "running" | "completed" | "failed" | "stopped";

export type FlowStep = {
  id: string;
  title: string;
  status: FlowStepStatus;
  detail?: string;
};

export type FlowRun = {
  schemaVersion: 1;
  id: string;
  title: string;
  prompt: string;
  locale: "ru" | "en";
  status: FlowRunStatus;
  createdAt: number;
  updatedAt: number;
  steps: FlowStep[];
  result?: string;
  error?: string;
  requestId?: string;
  actualModel?: string;
  artifactId?: string;
};

const STORAGE_KEY = "tklabs.erma-flow.runs.v1";
const MAX_RUNS = 16;
const MAX_PROMPT = 8_000;
const MAX_RESULT = 200_000;
export const FLOW_RUNS_UPDATED_EVENT = "tklabs:flow-runs-updated";

function newId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function cleanText(value: unknown, limit: number) {
  return typeof value === "string" ? value.replace(/\u0000/g, "").slice(0, limit) : "";
}

function isStatus(value: unknown): value is FlowRunStatus {
  return value === "planning" || value === "running" || value === "completed" || value === "stopped" || value === "failed";
}

function isStepStatus(value: unknown): value is FlowStepStatus {
  return value === "pending" || value === "running" || value === "completed" || value === "failed" || value === "stopped";
}

function sanitizeStep(value: unknown): FlowStep | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Partial<FlowStep>;
  if (typeof input.id !== "string" || !isStepStatus(input.status)) return null;
  const title = cleanText(input.title, 120);
  if (!title) return null;
  return {
    id: input.id,
    title,
    status: input.status,
    ...(typeof input.detail === "string" ? { detail: cleanText(input.detail, 220) } : {}),
  };
}

function sanitizeRun(value: unknown): FlowRun | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Partial<FlowRun>;
  if (
    typeof input.id !== "string"
    || !isStatus(input.status)
    || typeof input.createdAt !== "number"
    || typeof input.updatedAt !== "number"
    || (input.locale !== "ru" && input.locale !== "en")
  ) return null;
  const prompt = cleanText(input.prompt, MAX_PROMPT);
  if (!prompt) return null;
  return {
    schemaVersion: 1,
    id: input.id,
    title: cleanText(input.title, 120) || prompt.slice(0, 72),
    prompt,
    locale: input.locale,
    status: input.status,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
    steps: Array.isArray(input.steps)
      ? input.steps.map(sanitizeStep).filter((step): step is FlowStep => Boolean(step)).slice(0, 8)
      : [],
    ...(typeof input.result === "string" ? { result: cleanText(input.result, MAX_RESULT) } : {}),
    ...(typeof input.error === "string" ? { error: cleanText(input.error, 1_000) } : {}),
    ...(typeof input.requestId === "string" ? { requestId: cleanText(input.requestId, 120) } : {}),
    ...(typeof input.actualModel === "string" ? { actualModel: cleanText(input.actualModel, 120) } : {}),
    ...(typeof input.artifactId === "string" ? { artifactId: cleanText(input.artifactId, 120) } : {}),
  };
}

function notify() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(FLOW_RUNS_UPDATED_EVENT));
}

export function loadFlowRuns(): FlowRun[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(sanitizeRun)
      .filter((run): run is FlowRun => Boolean(run))
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, MAX_RUNS);
  } catch {
    return [];
  }
}

export function saveFlowRuns(runs: FlowRun[]) {
  if (typeof window === "undefined") return;
  const safe = runs
    .map(sanitizeRun)
    .filter((run): run is FlowRun => Boolean(run))
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, MAX_RUNS);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(safe));
  } catch {
    // A restricted or full storage area must not break Flow execution.
  }
  notify();
}

export function createFlowRun(prompt: string, locale: "ru" | "en", stepTitles: string[]): FlowRun {
  const now = Date.now();
  const cleanPrompt = cleanText(prompt, MAX_PROMPT).trim();
  return {
    schemaVersion: 1,
    id: newId(),
    title: cleanPrompt.replace(/\s+/g, " ").slice(0, 72),
    prompt: cleanPrompt,
    locale,
    status: "planning",
    createdAt: now,
    updatedAt: now,
    steps: stepTitles.slice(0, 8).map((title, index) => ({
      id: `step-${index + 1}`,
      title: cleanText(title, 120),
      status: index === 0 ? "running" : "pending",
    })),
  };
}

export function replaceFlowRun(runs: FlowRun[], next: FlowRun) {
  return [next, ...runs.filter((run) => run.id !== next.id)]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, MAX_RUNS);
}

export function updateFlowRun(run: FlowRun, update: Partial<Omit<FlowRun, "id" | "schemaVersion" | "createdAt">>): FlowRun {
  return sanitizeRun({ ...run, ...update, updatedAt: Date.now() }) ?? run;
}

export function updateFlowStep(run: FlowRun, index: number, update: Partial<FlowStep>): FlowRun {
  const steps = run.steps.map((step, stepIndex) => stepIndex === index ? { ...step, ...update } : step);
  return updateFlowRun(run, { steps });
}
