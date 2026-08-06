import type { AiGenerationResult, AiResponseMeta } from "@/lib/ai/types";

export function createAiResponseMeta(
  result: AiGenerationResult,
  requestedModel: string,
  requestId: string,
  startedAt: number,
  status = 200,
  now = Date.now(),
): AiResponseMeta {
  return {
    requestId,
    requestedModel,
    actualProvider: result.provider,
    actualModel: result.actualModel,
    latencyMs: Math.max(0, now - startedAt),
    httpStatus: status,
    ...(result.reasoningUsed ? { reasoningUsed: true } : {}),
    ...(result.fallbackReason ? { fallbackReason: result.fallbackReason } : {}),
    ...(typeof result.inputTokens === "number" ? { inputTokens: Math.max(0, Math.round(result.inputTokens)) } : {}),
    ...(typeof result.outputTokens === "number" ? { outputTokens: Math.max(0, Math.round(result.outputTokens)) } : {}),
    ...(typeof result.timeToFirstTokenMs === "number" ? { timeToFirstTokenMs: Math.max(0, Math.round(result.timeToFirstTokenMs)) } : {}),
    ...(typeof result.contextMessageCount === "number" ? { contextMessageCount: Math.max(0, Math.round(result.contextMessageCount)) } : {}),
    ...(typeof result.contextAttachmentCount === "number" ? { contextAttachmentCount: Math.max(0, Math.round(result.contextAttachmentCount)) } : {}),
    ...(typeof result.contextLimit === "number" ? { contextLimit: Math.max(0, Math.round(result.contextLimit)) } : {}),
    ...(result.contextCompacted ? { contextCompacted: true } : {}),
  };
}

export function localFallbackResult(language: "ru" | "en", reason: string): AiGenerationResult {
  return {
    answer: language === "ru"
      ? "Выбранная модель временно недоступна. Ответ сформирован резервным режимом."
      : "The selected model is temporarily unavailable. This answer was produced by a fallback mode.",
    provider: "edge-fallback",
    actualModel: "local-fallback",
    fallbackReason: reason,
  };
}
