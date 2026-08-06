export type AiProvider = "nvidia" | "clodex" | "edge-fallback";

export type AiGenerationResult = {
  answer: string;
  reasoningUsed?: boolean;
  provider: AiProvider;
  actualModel: string;
  fallbackReason?: string;
  inputTokens?: number;
  outputTokens?: number;
  timeToFirstTokenMs?: number;
  contextMessageCount?: number;
  contextAttachmentCount?: number;
  contextLimit?: number;
  contextCompacted?: boolean;
};

export type AiResponseMeta = {
  requestId: string;
  requestedModel: string;
  actualProvider: AiProvider;
  actualModel: string;
  latencyMs: number;
  httpStatus: number;
  reasoningUsed?: boolean;
  fallbackReason?: string;
  inputTokens?: number;
  outputTokens?: number;
  timeToFirstTokenMs?: number;
  contextMessageCount?: number;
  contextAttachmentCount?: number;
  contextLimit?: number;
  contextCompacted?: boolean;
};
