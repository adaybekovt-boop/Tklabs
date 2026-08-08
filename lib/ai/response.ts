import { createAiProvenance } from "@/lib/ai/provenance";
import type { AiGenerationResult, AiResponseMeta, AiToolCallTrace } from "@/lib/ai/types";

function safeToolCalls(value: AiToolCallTrace[] | undefined) {
  if (!value?.length) return undefined;
  const calls = value.slice(0, 6).map((call) => ({ id: call.id.slice(0, 120), name: call.name, status: call.status, durationMs: Math.max(0, Math.round(call.durationMs)), summary: call.summary.slice(0, 180), ...(call.links?.length ? { links: call.links.filter((link) => link.href.startsWith("/") && !link.href.startsWith("//")).slice(0, 5).map((link) => ({ label: link.label.slice(0, 120), href: link.href.slice(0, 240) })) } : {}) }));
  return calls.length ? calls : undefined;
}

export function createAiResponseMeta(result: AiGenerationResult, requestedModel: string, requestId: string, startedAt: number, status = 200, now = Date.now()): AiResponseMeta {
  const toolCalls = safeToolCalls(result.toolCalls);
  return { requestId, requestedModel, actualProvider: result.provider, actualModel: result.actualModel, latencyMs: Math.max(0, now - startedAt), httpStatus: status, provenance: createAiProvenance({ requestedModel, actualProvider: result.provider, generatedAt: new Date(now) }), ...(result.reasoningUsed ? { reasoningUsed: true } : {}), ...(result.fallbackReason ? { fallbackReason: result.fallbackReason } : {}), ...(typeof result.inputTokens === "number" ? { inputTokens: Math.max(0, Math.round(result.inputTokens)) } : {}), ...(typeof result.outputTokens === "number" ? { outputTokens: Math.max(0, Math.round(result.outputTokens)) } : {}), ...(typeof result.timeToFirstTokenMs === "number" ? { timeToFirstTokenMs: Math.max(0, Math.round(result.timeToFirstTokenMs)) } : {}), ...(typeof result.contextMessageCount === "number" ? { contextMessageCount: Math.max(0, Math.round(result.contextMessageCount)) } : {}), ...(typeof result.contextAttachmentCount === "number" ? { contextAttachmentCount: Math.max(0, Math.round(result.contextAttachmentCount)) } : {}), ...(typeof result.contextLimit === "number" ? { contextLimit: Math.max(0, Math.round(result.contextLimit)) } : {}), ...(result.contextCompacted ? { contextCompacted: true } : {}), ...(toolCalls ? { toolCalls } : {}) };
}

export function localFallbackResult(language: "ru" | "en", reason: string): AiGenerationResult { return { answer: language === "ru" ? "Выбранная модель временно недоступна. Ответ сформирован резервным режимом." : "The selected model is temporarily unavailable. This answer was produced by a fallback mode.", provider: "edge-fallback", actualModel: "local-fallback", fallbackReason: reason }; }
