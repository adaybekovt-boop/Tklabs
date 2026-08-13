import { AGENT_RUN_PROTOCOL_VERSION, isAgentRunEvent, type AgentRunEvent } from "@/lib/ai/agent-run";

const encoder = new TextEncoder();

export function encodeAgentRunEvent(message: AgentRunEvent) {
  return encoder.encode(`event: ${message.event}\ndata: ${JSON.stringify(message)}\n\n`);
}

export function parseAgentRunEventFrame(frame: string): AgentRunEvent | null {
  let eventName = "";
  const data: string[] = [];
  for (const line of frame.split(/\r?\n/)) {
    if (line.startsWith("event:")) eventName = line.slice(6).trim();
    if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
  }
  if (!eventName.includes(".") || data.length === 0) return null;
  try {
    const parsed = JSON.parse(data.join("\n")) as unknown;
    return isAgentRunEvent(parsed) && parsed.event === eventName ? parsed : null;
  } catch {
    return null;
  }
}

export function agentRunStreamHeaders(runId: string) {
  return new Headers({
    "cache-control": "no-cache, no-store, must-revalidate",
    "content-type": "text/event-stream; charset=utf-8",
    "x-accel-buffering": "no",
    "x-erma-run-id": runId,
    "x-erma-run-protocol": AGENT_RUN_PROTOCOL_VERSION,
  });
}
