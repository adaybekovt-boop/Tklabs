import { createAiProvenance } from "@/lib/ai/provenance";
import type { AiGenerationResult, AiGroundingMeta, AiResponseMeta, AiToolCallTrace } from "@/lib/ai/types";

function safeToolCalls(value: AiToolCallTrace[] | undefined) {
  if (!value?.length) return undefined;
  const calls = value.slice(0, 6).map((call) => ({ id: call.id.slice(0, 120), name: call.name, status: call.status, durationMs: Math.max(0, Math.round(call.durationMs)), summary: call.summary.slice(0, 180), ...(call.links?.length ? { links: call.links.filter((link) => link.href.startsWith("/") && !link.href.startsWith("//")).slice(0, 5).map((link) => ({ label: link.label.slice(0, 120), href: link.href.slice(0, 240) })) } : {}) }));
  return calls.length ? calls : undefined;
}

function safeGrounding(value: AiGroundingMeta | undefined): AiGroundingMeta | undefined {
  if (!value || value.provider !== "google-search" || value.directPassThrough !== true) return undefined;
  const citations = value.citations.slice(0, 16).filter((citation) => {
    try {
      const url = new URL(citation.url);
      return (url.protocol === "https:" || url.protocol === "http:") && Boolean(citation.title.trim());
    } catch { return false; }
  }).map((citation) => ({
    title: citation.title.trim().slice(0, 220),
    url: citation.url.slice(0, 2_000),
    ...(typeof citation.startIndex === "number" ? { startIndex: Math.max(0, Math.round(citation.startIndex)) } : {}),
    ...(typeof citation.endIndex === "number" ? { endIndex: Math.max(0, Math.round(citation.endIndex)) } : {}),
  }));
  const searchQueries = value.searchQueries.filter((query) => typeof query === "string" && query.trim()).slice(0, 8).map((query) => query.trim().slice(0, 400));
  const searchSuggestionsHtml = typeof value.searchSuggestionsHtml === "string" && value.searchSuggestionsHtml.length <= 60_000
    ? value.searchSuggestionsHtml
    : undefined;
  return { provider: "google-search", directPassThrough: true, searchQueries, citations, ...(searchSuggestionsHtml ? { searchSuggestionsHtml } : {}) };
}

export function createAiResponseMeta(result: AiGenerationResult, requestedModel: string, requestId: string, startedAt: number, status = 200, now = Date.now()): AiResponseMeta {
  const toolCalls = safeToolCalls(result.toolCalls);
  const grounding = safeGrounding(result.grounding);
  return { requestId, requestedModel, actualProvider: result.provider, actualModel: result.actualModel, latencyMs: Math.max(0, now - startedAt), httpStatus: status, provenance: createAiProvenance({ requestedModel, actualProvider: result.provider, generatedAt: new Date(now) }), ...(result.reasoningUsed ? { reasoningUsed: true } : {}), ...(result.fallbackReason ? { fallbackReason: result.fallbackReason } : {}), ...(typeof result.inputTokens === "number" ? { inputTokens: Math.max(0, Math.round(result.inputTokens)) } : {}), ...(typeof result.outputTokens === "number" ? { outputTokens: Math.max(0, Math.round(result.outputTokens)) } : {}), ...(typeof result.timeToFirstTokenMs === "number" ? { timeToFirstTokenMs: Math.max(0, Math.round(result.timeToFirstTokenMs)) } : {}), ...(typeof result.contextMessageCount === "number" ? { contextMessageCount: Math.max(0, Math.round(result.contextMessageCount)) } : {}), ...(typeof result.contextAttachmentCount === "number" ? { contextAttachmentCount: Math.max(0, Math.round(result.contextAttachmentCount)) } : {}), ...(typeof result.contextLimit === "number" ? { contextLimit: Math.max(0, Math.round(result.contextLimit)) } : {}), ...(result.contextCompacted ? { contextCompacted: true } : {}), ...(toolCalls ? { toolCalls } : {}), ...(grounding ? { grounding } : {}) };
}

export function localFallbackResult(language: "ru" | "en", reason: string): AiGenerationResult { return { answer: language === "ru" ? "Выбранная модель временно недоступна. Ответ сформирован резервным режимом." : "The selected model is temporarily unavailable. This answer was produced by a fallback mode.", provider: "edge-fallback", actualModel: "local-fallback", fallbackReason: reason }; }