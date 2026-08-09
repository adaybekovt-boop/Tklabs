import type { PreparedChatContext } from "@/lib/ai/context";
import { routeErmaTask } from "@/lib/ai/intelligence/router";
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
export type ToolAugmentation = { summary?: string; traces: AiToolCallTrace[]; directGrounding?: GoogleDirectGroundingResult };
function combineSummary(...parts: Array<string | undefined>) { return parts.filter(Boolean).join("\n\n").slice(0, 76_000) || undefined; }
function protectedMemory(summary: string | undefined) { return summary ? wrapUntrustedExternalText("conversation-memory", summary) : undefined; }

function shouldUseDirectGoogleGrounding(prompt: string, documents: readonly ChatAttachment[]) {
  if (documents.length || !isGoogleDirectGroundingConfigured()) return false;
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

  if (shouldUseDirectGoogleGrounding(input.prompt, documents)) {
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
    return { summary: combineSummary(conversationMemory, result.controlBlock, untrustedEvidence), traces: result.traces };
  } catch (error) {
    if (input.signal?.aborted) throw error;
    console.info("ai.tool_loop", { requestId: input.requestId, status: "skipped_after_error", reason: error instanceof Error ? error.message.slice(0, 80) : "unknown" });
    return { summary: conversationMemory, traces: [] };
  }
}