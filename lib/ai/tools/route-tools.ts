import type { PreparedChatContext } from "@/lib/ai/context";
import { routeErmaTask, type ErmaIntelligenceRoute } from "@/lib/ai/intelligence/router";
import type { ErmaVerificationResult } from "@/lib/ai/intelligence/verifier";
import { runNvidiaToolLoop } from "@/lib/ai/providers/nvidia-tools";
import { sanitizeLocalArchiveIndex } from "@/lib/ai/tools/executor";
import type { AiToolCallTrace } from "@/lib/ai/types";
import { wrapUntrustedExternalText } from "@/lib/ai/untrusted";
import { getGoogleDirectGrounding, isGoogleDirectGroundingConfigured, type GoogleDirectGroundingResult } from "@/lib/ai/web/google-direct";
import { classifyPromptSafety, evaluateAssistantOutput } from "@/lib/ai-safety";
import type { ChatAttachment } from "@/lib/chat-prompt";
import type { ErmaModel } from "@/lib/models/server";
import type { HealthPayload } from "@/lib/provider-health";

type Language = "ru" | "en";
export type GroundingGuard = { answer: string; reason: "kazakhstan_external_verification_unavailable" };
export type ToolAugmentation = { summary?: string; traces: AiToolCallTrace[]; directGrounding?: GoogleDirectGroundingResult; guardedAnswer?: GroundingGuard };
function combineSummary(...parts: Array<string | undefined>) { return parts.filter(Boolean).join("\n\n").slice(0, 76_000) || undefined; }
function protectedMemory(summary: string | undefined) { return summary ? wrapUntrustedExternalText("conversation-memory", summary) : undefined; }

const EXPLICIT_CONTEXT_REFERENCE = /(?:предыдущ[\p{L}\p{M}]*|сообщени[\p{L}\p{M}]*\s+выше|выше\s+(?:я\s+)?(?:писал|сказал)|как\s+я\s+(?:писал|сказал)|в\s+этом\s+(?:диалоге|чате)|этот\s+(?:вопрос|запрос)|про\s+(?:него|неё|нее|них|это)|насч[её]т\s+(?:него|неё|нее|них|этого)|previous\s+(?:message|answer|turn)|message\s+above|as\s+i\s+(?:said|wrote)|in\s+this\s+(?:chat|conversation)|this\s+(?:question|request)|about\s+(?:him|her|them|that|it))/iu;
const DEICTIC_FOLLOW_UP = /^(?:а|и|ну|and|but|so)?\s*(?:кто|что|какой|какая|какие|где|когда|сколько|почему|как|who|what|which|where|when|why|how(?:\s+many)?)?\s*(?:он|она|они|это|этот|эта|эти|там|теперь|дальше|тогда|he|she|they|it|that|this|those|there|now|next|then)(?:\s|[?!.:,;]|$)/iu;

export function isContextDependentGroundingTurn(prompt: string, originalMessageCount: number) {
  if (originalMessageCount <= 1) return false;
  const normalized = prompt.trim();
  return EXPLICIT_CONTEXT_REFERENCE.test(normalized) || DEICTIC_FOLLOW_UP.test(normalized);
}

function isKazakhstanVerificationRoute(route: ErmaIntelligenceRoute | undefined) {
  return Boolean(route?.reasonCode.includes("KAZAKHSTAN") && ["fact_lookup", "fresh_information", "research"].includes(route.intent));
}

export function buildKazakhstanVerificationGuard(language: Language, route: ErmaIntelligenceRoute | undefined, verification?: ErmaVerificationResult): GroundingGuard | undefined {
  if (!isKazakhstanVerificationRoute(route) || verification?.status === "verified") return undefined;
  const current = route?.intent === "fresh_information";
  const research = route?.intent === "research";
  return {
    reason: "kazakhstan_external_verification_unavailable",
    answer: language === "ru"
      ? current
        ? "Не удалось получить надёжное актуальное подтверждение по внешним источникам о Казахстане. Я не буду выдавать новости, текущих должностных лиц, курсы, цены или другие меняющиеся данные по памяти модели как свежие факты. Повторите запрос позже — при доступном Google Search Erma вернёт актуальный grounded-ответ с источниками."
        : research
          ? "Не удалось собрать и проверить внешние источники для этого исследования по Казахстану. Я не буду выдавать неподтверждённый пересказ по памяти модели за проверенное исследование. Повторите запрос позже, когда web-grounding будет доступен."
          : "Не удалось надёжно проверить этот точный факт о Казахстане по внешним источникам. Я не буду угадывать состав жузов, родов или племён, рейтинги, даты, должностных лиц и другие точные данные по памяти модели. Повторите запрос позже — при доступном Google Search Erma вернёт проверенный grounded-ответ с источниками."
      : current
        ? "I could not obtain reliable current external verification for this Kazakhstan request. I will not present news, current officeholders, rates, prices, or other changing data from model memory as fresh facts. Try again later; when Google Search is available, Erma will return a current grounded answer with sources."
        : research
          ? "I could not collect and verify external sources for this Kazakhstan research request. I will not present an unverified memory-based summary as sourced research. Try again later when web grounding is available."
          : "I could not reliably verify this exact Kazakhstan fact against external sources. I will not guess zhuz, clan or tribe membership, rankings, dates, officeholders, or other exact data from model memory. Try the request again later; when Google Search is available, Erma will return a grounded answer with sources.",
  };
}

function shouldUseDirectGoogleGrounding(prompt: string, documents: readonly ChatAttachment[], context: PreparedChatContext) {
  if (documents.length || !isGoogleDirectGroundingConfigured() || isContextDependentGroundingTurn(prompt, context.originalMessageCount)) return false;
  const safety = classifyPromptSafety(prompt);
  if (safety.blocked || safety.category === "high-impact" || safety.category === "restricted") return false;
  const route = routeErmaTask(prompt);
  return route.toolClass === "web" && ["fact_lookup", "fresh_information", "research"].includes(route.intent);
}

function directGoogleTrace(requestId: string, language: Language, result: GoogleDirectGroundingResult, durationMs: number): AiToolCallTrace {
  return {
    id: `google-grounding-${requestId}`.slice(0, 120),
    name: "search_web",
    status: "success",
    durationMs: Math.max(0, Math.round(durationMs)),
    summary: language === "ru"
      ? `Google Search: прямой grounded-ответ, источников: ${result.grounding.citations.length}`
      : `Google Search: direct grounded response, sources: ${result.grounding.citations.length}`,
  };
}

export async function prepareReadOnlyToolAugmentation(input: { request: Request; requestId: string; prompt: string; context: PreparedChatContext; language: Language; model: ErmaModel; localArchive: unknown; documents?: ChatAttachment[]; allowCodeSandbox?: boolean; signal?: AbortSignal }): Promise<ToolAugmentation> {
  const conversationMemory = protectedMemory(input.context.summary);
  const documents = input.documents ?? [];

  if (shouldUseDirectGoogleGrounding(input.prompt, documents, input.context)) {
    const startedAt = Date.now();
    try {
      const directGrounding = await getGoogleDirectGrounding(input.prompt, input.signal);
      const outputSafety = evaluateAssistantOutput(directGrounding.answer, { allowCode: input.allowCodeSandbox === true });
      if (outputSafety.verdict !== "ok") throw new Error(`google_grounding_output_${outputSafety.verdict}`);
      return {
        summary: conversationMemory,
        traces: [directGoogleTrace(input.requestId, input.language, directGrounding, Date.now() - startedAt)],
        directGrounding,
      };
    } catch (error) {
      if (input.signal?.aborted) throw error;
      console.info("ai.google_direct_grounding", {
        requestId: input.requestId,
        status: "fallback_to_erma_search",
        reason: error instanceof Error ? error.message.slice(0, 80) : "unknown",
      });
    }
  }

  try {
    const result = await runNvidiaToolLoop({ prompt: input.prompt, messages: input.context.messages, summary: input.context.summary, language: input.language, model: input.model, requestId: input.requestId, localArchive: sanitizeLocalArchiveIndex(input.localArchive), documents, allowCodeSandbox: input.allowCodeSandbox === true, signal: input.signal, getServiceStatus: async (signal) => { const statusUrl = new URL("/api/status", input.request.url); const response = await fetch(statusUrl, { method: "GET", signal, headers: { accept: "application/json" }, cache: "no-store" }); if (!response.ok) throw new Error("service_status_unavailable"); return await response.json() as HealthPayload; } });
    const untrustedEvidence = result.untrustedContextBlock ? wrapUntrustedExternalText("intelligence-evidence", result.untrustedContextBlock) : undefined;
    return {
      summary: combineSummary(conversationMemory, result.controlBlock, untrustedEvidence),
      traces: result.traces,
      guardedAnswer: buildKazakhstanVerificationGuard(input.language, result.route, result.verification),
    };
  } catch (error) {
    if (input.signal?.aborted) throw error;
    console.info("ai.tool_loop", { requestId: input.requestId, status: "skipped_after_error", reason: error instanceof Error ? error.message.slice(0, 80) : "unknown" });
    const route = routeErmaTask(input.prompt);
    return { summary: conversationMemory, traces: [], guardedAnswer: buildKazakhstanVerificationGuard(input.language, route) };
  }
}
