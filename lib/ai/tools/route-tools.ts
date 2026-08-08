import type { PreparedChatContext } from "@/lib/ai/context";
import { runNvidiaToolLoop } from "@/lib/ai/providers/nvidia-tools";
import { sanitizeLocalArchiveIndex } from "@/lib/ai/tools/executor";
import type { AiToolCallTrace } from "@/lib/ai/types";
import { wrapUntrustedExternalText } from "@/lib/ai/untrusted";
import type { ChatAttachment } from "@/lib/chat-prompt";
import type { ErmaModel } from "@/lib/models/server";
import type { HealthPayload } from "@/lib/provider-health";

type Language = "ru" | "en";
export type ToolAugmentation = { summary?: string; traces: AiToolCallTrace[] };
function combineSummary(...parts: Array<string | undefined>) { return parts.filter(Boolean).join("\n\n").slice(0, 76_000) || undefined; }
function protectedMemory(summary: string | undefined) { return summary ? wrapUntrustedExternalText("conversation-memory", summary) : undefined; }

export async function prepareReadOnlyToolAugmentation(input: { request: Request; requestId: string; prompt: string; context: PreparedChatContext; language: Language; model: ErmaModel; localArchive: unknown; documents?: ChatAttachment[]; allowCodeSandbox?: boolean; signal?: AbortSignal }): Promise<ToolAugmentation> {
  const conversationMemory = protectedMemory(input.context.summary);
  try {
    const result = await runNvidiaToolLoop({ prompt: input.prompt, messages: input.context.messages, summary: input.context.summary, language: input.language, model: input.model, requestId: input.requestId, localArchive: sanitizeLocalArchiveIndex(input.localArchive), documents: input.documents ?? [], allowCodeSandbox: input.allowCodeSandbox === true, signal: input.signal, getServiceStatus: async (signal) => { const statusUrl = new URL("/api/status", input.request.url); const response = await fetch(statusUrl, { method: "GET", signal, headers: { accept: "application/json" }, cache: "no-store" }); if (!response.ok) throw new Error("service_status_unavailable"); return await response.json() as HealthPayload; } });
    const untrustedEvidence = result.untrustedContextBlock ? wrapUntrustedExternalText("intelligence-evidence", result.untrustedContextBlock) : undefined;
    return { summary: combineSummary(conversationMemory, result.controlBlock, untrustedEvidence), traces: result.traces };
  } catch (error) {
    if (input.signal?.aborted) throw error;
    console.info("ai.tool_loop", { requestId: input.requestId, status: "skipped_after_error", reason: error instanceof Error ? error.message.slice(0, 80) : "unknown" });
    return { summary: conversationMemory, traces: [] };
  }
}
