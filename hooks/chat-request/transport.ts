import { announceErmaVoiceReply } from "@/lib/ai/voice-mode";
import type { AiResponseMeta } from "@/lib/ai/types";
import { isAgentRunEvent, type AgentRunEvent } from "@/lib/ai/agent-run";

import type { ActiveConversation, ChatContextStats } from "./contracts";

type StreamPayload = Record<string, unknown>;

export type StreamOutcome = {
  receivedDone: boolean;
  receivedContent: boolean;
  streamError: string;
  content: string;
  stopped: boolean;
};

export type StreamCallbacks = {
  heartbeat(): void;
  connected(stats: ChatContextStats | null, requestId: string): void;
  delta(text: string): void;
  meta(meta: AiResponseMeta): void;
  agentEvent?(event: AgentRunEvent): void;
  isCurrent?(): boolean;
  networkError: string;
};

export function isResponseMeta(value: unknown): value is AiResponseMeta {
  if (!value || typeof value !== "object") return false;
  const meta = value as Partial<AiResponseMeta>;
  return typeof meta.requestId === "string"
    && typeof meta.requestedModel === "string"
    && (meta.actualProvider === "nvidia"
      || meta.actualProvider === "google"
      || meta.actualProvider === "cerebras"
      || meta.actualProvider === "groq"
      || meta.actualProvider === "google-grounding"
      || meta.actualProvider === "clodex"
      || meta.actualProvider === "edge-fallback")
    && typeof meta.actualModel === "string"
    && typeof meta.latencyMs === "number" && Number.isFinite(meta.latencyMs)
    && typeof meta.httpStatus === "number" && Number.isFinite(meta.httpStatus);
}

export function safeRetrySeconds(response: Response, payload: unknown) {
  const header = Number(response.headers.get("retry-after"));
  const body = payload && typeof payload === "object" && "retryAfter" in payload
    ? Number((payload as { retryAfter?: unknown }).retryAfter)
    : 0;
  const value = Number.isFinite(header) && header > 0 ? header : body;
  return Number.isFinite(value) && value > 0
    ? Math.min(3600, Math.max(1, Math.ceil(value)))
    : undefined;
}

export function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

export function contextStatsFromPayload(payload: unknown): ChatContextStats | null {
  if (!payload || typeof payload !== "object") return null;
  const context = payload as Partial<ChatContextStats>;
  if (
    typeof context.estimatedTokens !== "number"
    || typeof context.messages !== "number"
    || typeof context.attachments !== "number"
    || typeof context.limit !== "number"
    || ![context.estimatedTokens, context.messages, context.attachments, context.limit].every(Number.isFinite)
  ) return null;
  return {
    estimatedTokens: Math.max(0, Math.round(context.estimatedTokens)),
    messages: Math.max(0, Math.round(context.messages)),
    attachments: Math.max(0, Math.round(context.attachments)),
    limit: Math.max(1, Math.round(context.limit)),
    compacted: context.compacted === true,
  };
}

function parseEventBlock(block: string): { event: string; payload: unknown } | null {
  let event = "message";
  const data: string[] = [];
  for (const line of block.split(/\r?\n/)) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
  }
  if (!data.length) return null;
  try {
    return { event, payload: JSON.parse(data.join("\n")) as unknown };
  } catch {
    return null;
  }
}

export async function consumeAiEventStream(
  response: Response,
  conversation: ActiveConversation,
  callbacks: StreamCallbacks,
): Promise<StreamOutcome> {
  if (!response.body) throw new Error("The streaming response has no body.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let receivedDone = false;
  let receivedContent = false;
  let streamError = "";
  let content = "";
  let stopped = false;
  let named = false;
  let runId = "";
  let lastSequence = -1;
  let terminal = false;

  try {
    while (!terminal) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });
      if (buffer.length > 262_144) throw new Error("Stream frame exceeded its limit.");
      const blocks = buffer.split(/\r?\n\r?\n/);
      buffer = done ? "" : (blocks.pop() ?? "");

      for (const block of blocks) {
        if (callbacks.isCurrent?.() === false) { terminal = true; break; }
        const parsed = parseEventBlock(block);
        if (!parsed) continue;
        const payload = parsed.payload && typeof parsed.payload === "object" && !Array.isArray(parsed.payload) ? parsed.payload as StreamPayload : {};
        if (parsed.event.includes(".")) {
          if (!isAgentRunEvent(parsed.payload) || parsed.payload.event !== parsed.event) continue;
          const message = parsed.payload;
          if (runId && message.runId !== runId || message.sequence <= lastSequence) continue;
          runId = message.runId; lastSequence = message.sequence; named = true;
          callbacks.heartbeat();
          callbacks.agentEvent?.(message);
          const data = message.payload && typeof message.payload === "object" ? message.payload as StreamPayload : {};
          if (message.event === "answer.delta" && typeof data.text === "string") deliver(data.text);
          if (message.event === "run.failed") { streamError = typeof data.error === "string" ? data.error : callbacks.networkError; receivedDone = true; terminal = true; }
          if (message.event === "run.completed") { receivedDone = true; terminal = true; }
          if (message.event === "run.cancelled") { receivedDone = true; stopped = true; terminal = true; }
          if (terminal) break;
          continue;
        }
        callbacks.heartbeat();

      if (parsed.event === "start") {
        callbacks.connected(
          contextStatsFromPayload(payload.context),
          typeof payload.requestId === "string"
            ? payload.requestId
            : conversation.requestId,
        );
        continue;
      }

      if (parsed.event === "delta") {
        if (!named && typeof payload.text === "string") deliver(payload.text);
        continue;
      }

      if (parsed.event === "meta" && isResponseMeta(parsed.payload)) {
        callbacks.meta(parsed.payload);
        continue;
      }

      if (parsed.event === "error") {
        streamError = typeof payload.error === "string"
          ? payload.error
          : callbacks.networkError;
      }
      if (parsed.event === "done") { receivedDone = true; stopped = payload.stopped === true; terminal = true; break; }
    }
      if (done) break;
    }
  } finally {
    if (terminal) await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }

  function deliver(delta: string) {
    if (!delta || content.length + delta.length > 200_000) throw new Error("Response exceeded its limit.");
    receivedContent = true; content += delta; callbacks.delta(delta);
  }

  if (receivedDone && !stopped && !streamError && content.trim()) {
    announceErmaVoiceReply({ id: conversation.assistantId, role: "assistant", content });
  }
  return { receivedDone, receivedContent, streamError, content, stopped };
}
