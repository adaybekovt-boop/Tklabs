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
function combineSummary(summary: string | undefined, toolContext: string | undefined) { return [summary, toolContext].filter(Boolean).join("\n\n").slice(0, 72_000) || undefined; }

export async function prepareReadOnlyToolAugmentation(input: { request: Request; requestId: string; context: PreparedChatContext; language: Language; model: ErmaModel; localArchive: unknown; documents?: ChatAttachment[]; signal?: AbortSignal }): Promise<ToolAugmentation> {
  try {
    const result = await runNvidiaToolLoop({ messages: input.context.messages, summary: input.context.summary, language: input.language, model: input.model, requestId: input.requestId, localArchive: sanitizeLocalArchiveIndex(input.localArchive), documents: input.documents ?? [], signal: input.signal, getServiceStatus: async (signal) => { const statusUrl = new URL("/api/status", input.request.url); const response = await fetch(statusUrl, { method: "GET", signal, headers: { accept: "application/json" }, cache: "no-store" }); if (!response.ok) throw new Error("service_status_unavailable"); return await response.json() as HealthPayload; } });
    const untrustedTools = result.contextBlock ? wrapUntrustedExternalText("read-only-tool-results", result.contextBlock) : undefined;
    return { summary: combineSummary(input.context.summary, untrustedTools), traces: result.traces };
  } catch (error) { if (input.signal?.aborted) throw error; console.info("ai.tool_loop", { requestId: input.requestId, status: "skipped_after_error", reason: error instanceof Error ? error.message.slice(0, 80) : "unknown" }); return { summary: input.context.summary, traces: [] }; }
}
