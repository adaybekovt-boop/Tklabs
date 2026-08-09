import { announceErmaVoiceReply } from "@/lib/ai/voice-mode";
import type { AiResponseMeta } from "@/lib/ai/types";

import type { ActiveConversation, ChatContextStats } from "./contracts";

type StreamPayload = Record<string, unknown>;

export type StreamOutcome = {
  receivedDone: boolean;
  receivedContent: boolean;
  streamError: string;
  content: string;
};

export type StreamCallbacks = {
  heartbeat(): void;
  connected(stats: ChatContextStats | null, requestId: string): void;
  delta(text: string): void;
  meta(meta: AiResponseMeta): void;
  networkError: string;
};

export function isResponseMeta(value: unknown): value is AiResponseMeta {
  if (!value || typeof value !== "object") return false;
  const meta = value as Partial<AiResponseMeta>;
  return typeof meta.requestId === "string"
    && typeof meta.requestedModel === "string"
    && (meta.actualProvider === "nvidia"
      || meta.actualProvider === "google-grounding"
      || meta.actualProvider === "clodex"
      || meta.actualProvider === "edge-fallback")
    && typeof meta.actualModel === "string"
    && typeof meta.latencyMs === "number"
    && typeof meta.httpStatus === "number";
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
  ) return null;
  return {
    estimatedTokens: Math.max(0, Math.round(context.estimatedTokens)),
    messages: Math.max(0, Math.round(context.messages)),
    attachments: Math.max(0, Math.round(context.attachments)),
    limit: Math.max(1, Math.round(context.limit)),
    compacted: context.compacted === true,
  };
}

function parseEventBlock(block: string) {
  let event = "message";
  const data: string[] = [];
  for (const line of block.split(/\r?\n/)) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
  }
  if (!data.length) return null;
  try {
    return { event, payload: JSON.parse(data.join("\n")) as StreamPayload };
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

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });
    const blocks = buffer.split(/\r?\n\r?\n/);
    buffer = done ? "" : (blocks.pop() ?? "");

    for (const block of blocks) {
      const parsed = parseEventBlock(block);
      if (!parsed) continue;
      callbacks.heartbeat();

      if (parsed.event === "start") {
        callbacks.connected(
          contextStatsFromPayload(parsed.payload.context),
          typeof parsed.payload.requestId === "string"
            ? parsed.payload.requestId
            : conversation.requestId,
        );
        continue;
      }

      if (parsed.event === "delta") {
        const delta = typeof parsed.payload.text === "string" ? parsed.payload.text : "";
        if (!delta) continue;
        receivedContent = true;
        content += delta;
        callbacks.delta(delta);
        continue;
      }

      if (parsed.event === "meta" && isResponseMeta(parsed.payload)) {
        callbacks.meta(parsed.payload);
        continue;
      }

      if (parsed.event === "error") {
        streamError = typeof parsed.payload.error === "string"
          ? parsed.payload.error
          : callbacks.networkError;
      }
      if (parsed.event === "done") receivedDone = true;
    }

    if (done) break;
  }

  if (receivedDone && !streamError && content.trim()) {
    announceErmaVoiceReply({ id: conversation.assistantId, role: "assistant", content });
  }
  return { receivedDone, receivedContent, streamError, content };
}
