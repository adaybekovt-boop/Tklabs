import { estimateTextTokens, type PreparedChatContext } from "@/lib/ai/context";
import { logAiProviderFailure } from "@/lib/ai/logging";
import { generateWithClodex } from "@/lib/ai/providers/clodex";
import { localFallbackResult } from "@/lib/ai/response";
import type { AiGenerationResult, AiToolCallTrace } from "@/lib/ai/types";
import { isClodexEnabled } from "@/lib/feature-flags";
import { getClodexModelConfig } from "@/lib/models/clodex-server";

import type { Language } from "./contracts";

export function contextualFallbackPrompt(context: PreparedChatContext, augmentedSummary?: string) {
  const sections = [
    augmentedSummary
      ? `Conversation memory and verified internal tool data:\n${augmentedSummary}`
      : context.summary
        ? `Conversation memory summary:\n${context.summary}`
        : "",
    ...context.messages.map((message) => `${message.role === "user" ? "User" : "Assistant"}:\n${message.content}`),
  ].filter(Boolean);
  const flattened = sections.join("\n\n");
  const characters = Array.from(flattened);
  return characters.length > 120_000 ? characters.slice(-120_000).join("") : flattened;
}

export function withContextMetadata(result: AiGenerationResult, context: PreparedChatContext): AiGenerationResult {
  return {
    ...result,
    inputTokens: result.inputTokens ?? context.estimatedTokens,
    outputTokens: result.outputTokens ?? estimateTextTokens(result.answer),
    contextMessageCount: context.includedMessageCount,
    contextAttachmentCount: context.attachmentCount,
    contextLimit: context.contextLimit,
    contextCompacted: context.compacted,
  };
}

export function withToolCalls(result: AiGenerationResult, toolCalls: AiToolCallTrace[]): AiGenerationResult {
  return toolCalls.length ? { ...result, toolCalls } : result;
}

export async function resolveFallback(input: {
  prompt: string;
  language: Language;
  allowCode: boolean;
  requestId: string;
  requestedModel: string;
  primaryReason: string;
  signal?: AbortSignal;
}): Promise<AiGenerationResult> {
  const apiKey = process.env.CLODEX_API_KEY?.trim();
  const fallbackModel = getClodexModelConfig({ requireRuntimeConfig: true })?.[0];
  if (isClodexEnabled() && apiKey && fallbackModel) {
    try {
      const { answer, reasoningUsed, actualModel, inputTokens, outputTokens } = await generateWithClodex(
        input.prompt,
        apiKey,
        fallbackModel.providerModel,
        fallbackModel.maxTokens,
        input.language,
        input.allowCode,
        input.signal,
      );
      return {
        answer,
        reasoningUsed,
        provider: "clodex",
        actualModel,
        fallbackReason: input.primaryReason,
        inputTokens,
        outputTokens,
      };
    } catch (error) {
      logAiProviderFailure({
        requestId: input.requestId,
        requestedModel: input.requestedModel,
        provider: "clodex",
        status: typeof error === "object" && error && "status" in error && typeof error.status === "number" ? error.status : undefined,
        reason: error instanceof Error ? error.message : "clodex_failed",
      });
    }
  }

  return localFallbackResult(
    input.language,
    isClodexEnabled() ? `${input.primaryReason};clodex_unavailable` : `${input.primaryReason};clodex_disabled`,
  );
}

export function providerFailureReason(error: unknown) {
  if (error instanceof Error && error.message === "nvidia_not_configured") return "nvidia_not_configured";
  if (error instanceof Error && error.message === "nvidia_output_blocked") return "safety_output_blocked";
  return "nvidia_request_failed";
}

export function streamInterruptedText(language: Language) {
  return language === "ru"
    ? "Соединение с моделью прервалось. Частичный ответ сохранён."
    : "The model connection was interrupted. The partial response was saved.";
}
