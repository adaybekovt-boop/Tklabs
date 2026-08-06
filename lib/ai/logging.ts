import type { AiResponseMeta } from "@/lib/ai/types";

export function logAiRequest(meta: AiResponseMeta) {
  console.info("ai.request", {
    requestId: meta.requestId,
    requestedModel: meta.requestedModel,
    actualProvider: meta.actualProvider,
    actualModel: meta.actualModel,
    latencyMs: meta.latencyMs,
    httpStatus: meta.httpStatus,
    ...(meta.reasoningUsed ? { reasoningUsed: true } : {}),
    ...(meta.fallbackReason ? { fallbackReason: meta.fallbackReason } : {}),
  });
}

export function logAiProviderFailure(input: { requestId: string; requestedModel: string; provider: string; status?: number; reason: string }) {
  console.warn("ai.provider_failure", {
    requestId: input.requestId,
    requestedModel: input.requestedModel,
    provider: input.provider,
    ...(input.status ? { status: input.status } : {}),
    reason: input.reason,
  });
}
