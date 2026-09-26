export type FlowStreamEvent = "start" | "tool" | "delta" | "meta" | "error" | "done";
export type FlowStreamPayload = Record<string, unknown>;

export function parseFlowStreamFrame(frame: string): { event: FlowStreamEvent; payload: FlowStreamPayload } | null {
  const lines = frame.split(/\r?\n/);
  const event = lines.find((line) => line.startsWith("event:"))?.slice(6).trim();
  if (!event || !["start", "tool", "delta", "meta", "error", "done"].includes(event)) return null;
  const data = lines.filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trimStart()).join("\n");
  try {
    const payload: unknown = JSON.parse(data);
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
    return { event: event as FlowStreamEvent, payload: payload as FlowStreamPayload };
  } catch {
    return null;
  }
}

export function flowStreamToolName(payload: FlowStreamPayload, fallback: string) {
  return typeof payload.name === "string" && payload.name.trim() ? payload.name.trim().slice(0, 120) : fallback;
}

/** Nonempty partial text is useful work, but it is never evidence of completion. */
export function concludeFlowStream(input: {
  result: string;
  receivedDone: boolean;
  stopped: boolean;
  partial: boolean;
  error: string;
}, messages: { incomplete: string; stopped: string }) {
  if (input.stopped) return { status: "stopped" as const, result: input.result, error: messages.stopped };
  if (!input.receivedDone || input.partial || input.error || !input.result.trim()) {
    return { status: "failed" as const, result: input.result, error: input.error || messages.incomplete };
  }
  return { status: "completed" as const, result: input.result };
}
