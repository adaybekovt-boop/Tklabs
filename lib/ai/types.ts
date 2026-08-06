export type AiProvider = "nvidia" | "clodex" | "edge-fallback";

export type AiGenerationResult = {
  answer: string;
  reasoningUsed?: boolean;
  provider: AiProvider;
  actualModel: string;
  fallbackReason?: string;
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
};
