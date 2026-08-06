import { auth } from "@/auth";
import { generateWithClodex } from "@/lib/ai/providers/clodex";
import { generateWithNvidia, streamWithNvidia } from "@/lib/ai/providers/nvidia";
import { logAiProviderFailure, logAiRequest } from "@/lib/ai/logging";
import { newRequestId } from "@/lib/ai/provider-http";
import type { AiGenerationResult, AiToolCallTrace } from "@/lib/ai/types";
import { createAiResponseMeta, localFallbackResult } from "@/lib/ai/response";
import { prepareReadOnlyToolAugmentation } from "@/lib/ai/tools/route-tools";
import { classifyPromptSafety, safetyRefusal } from "@/lib/ai-safety";
import {
  ChatContextValidationError,
  estimateTextTokens,
  prepareChatContext,
  type PreparedChatContext,
} from "@/lib/ai/context";
import { aiStreamHeaders, encodeAiStreamEvent } from "@/lib/ai/sse";
import { promptValidationMessage, PromptValidationError, validateAndBuildProviderPrompt } from "@/lib/chat-prompt";
import { DemoRateLimitUnavailableError, commitDemoRequest, releaseDemoRequest, reserveDemoRequest } from "@/lib/demo-rate-limit-access";
import { isClodexEnabled } from "@/lib/feature-flags";
import { getErmaModel, type ErmaTone } from "@/lib/models/server";
import { getClodexModelConfig } from "@/lib/models/clodex-server";
import { getRateLimitIdentity, RateLimitConfigurationError } from "@/lib/rate-limit-identity";
import { isPrivilegedAiEmail } from "@/lib/privileged-access";
import { parseJsonBody, RequestBodyTooLargeError } from "@/lib/request-body";
import { isTrustedRequestOrigin } from "@/lib/request-security";

export const runtime = "edge";

type Language = "ru" | "en";
type ReasoningEffort = "low" | "medium" | "high";
type ChatRequest = {
  prompt?: unknown;
  messages?: unknown;
  locale?: unknown;
  model?: unknown;
  reasonEnabled?: unknown;
  effort?: unknown;
  tone?: unknown;
  attachments?: unknown;
  localArchive?: unknown;
};

type QuotaSettlement = "pending" | "committed" | "released";

function normalizeEffort(value: unknown): ReasoningEffort {
  return value === "low" || value === "high" ? value : "medium";
}

function normalizeTone(value: unknown): ErmaTone {
  if (value === "character") return "character";
  if (value === "erma") return "erma";
  return "professional";
}

function responseHeaders(requestId: string, setCookie?: string | null) {
  const headers = new Headers({ "cache-control": "no-store", "x-request-id": requestId });
  if (setCookie) headers.set("set-cookie", setCookie);
  return headers;
}

function jsonResponse(payload: unknown, requestId: string, status = 200, setCookie?: string | null) {
  return Response.json(payload, { status, headers: responseHeaders(requestId, setCookie) });
}

function promptErrorResponse(error: PromptValidationError, language: Language, privileged: boolean, requestId: string) {
  return jsonResponse(
    { error: promptValidationMessage(error.code, language, privileged), code: error.code, requestId },
    requestId,
    error.status,
  );
}

function contextErrorResponse(error: ChatContextValidationError, language: Language, requestId: string) {
  const errorText = error.status === 413
    ? language === "ru"
      ? "Контекст диалога превышает допустимый лимит. Начните новый диалог или исключите часть сообщений."
      : "The conversation context exceeds the allowed limit. Start a new chat or exclude some messages."
    : language === "ru"
      ? "История диалога содержит некорректные сообщения."
      : "The conversation history contains invalid messages.";
  return jsonResponse({ error: errorText, code: "invalid_context", requestId }, requestId, error.status);
}

function contextualFallbackPrompt(context: PreparedChatContext, augmentedSummary?: string) {
  const sections = [
    augmentedSummary ? `Conversation memory and verified internal tool data:\n${augmentedSummary}` : context.summary ? `Conversation memory summary:\n${context.summary}` : "",
    ...context.messages.map((message) => `${message.role === "user" ? "User" : "Assistant"}:\n${message.content}`),
  ].filter(Boolean);
  const flattened = sections.join("\n\n");
  const characters = Array.from(flattened);
  return characters.length > 120_000 ? characters.slice(-120_000).join("") : flattened;
}

function withContextMetadata(result: AiGenerationResult, context: PreparedChatContext): AiGenerationResult {
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

function withToolCalls(result: AiGenerationResult, toolCalls: AiToolCallTrace[]): AiGenerationResult {
  return toolCalls.length ? { ...result, toolCalls } : result;
}

async function resolveFallback(input: {
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

function providerFailureReason(error: unknown) {
  if (error instanceof Error && error.message === "nvidia_not_configured") return "nvidia_not_configured";
  if (error instanceof Error && error.message === "nvidia_output_blocked") return "safety_output_blocked";
  return "nvidia_request_failed";
}

function streamInterruptedText(language: Language) {
  return language === "ru"
    ? "Соединение с моделью прервалось. Частичный ответ сохранён."
    : "The model connection was interrupted. The partial response was saved.";
}

export async function POST(request: Request) {
  const requestId = newRequestId();
  if (!isTrustedRequestOrigin(request)) return jsonResponse({ error: "Request origin is not allowed.", requestId }, requestId, 403);

  let body: ChatRequest | null;
  try {
    body = await parseJsonBody<ChatRequest>(request);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return jsonResponse({ error: "Request body is too large.", requestId }, requestId, 413);
    throw error;
  }

  const language: Language = body?.locale === "en" ? "en" : "ru";
  const model = getErmaModel(typeof body?.model === "string" ? body.model : undefined);
  const requestedReasoning = body?.reasonEnabled === true;
  const effort = normalizeEffort(body?.effort);
  const tone = normalizeTone(body?.tone);
  const wantsStream = request.headers.get("accept")?.toLowerCase().includes("text/event-stream") === true;
  let sessionEmail = "";
  try {
    const session = await auth();
    sessionEmail = session?.user?.email?.trim().toLowerCase() ?? "";
  } catch {
    // Guest demo requests remain usable when optional auth configuration is absent.
  }
  const privilegedAccount = isPrivilegedAiEmail(sessionEmail);

  let validatedPrompt;
  try {
    validatedPrompt = validateAndBuildProviderPrompt(body?.prompt, body?.attachments, { privileged: privilegedAccount });
  } catch (error) {
    if (error instanceof PromptValidationError) return promptErrorResponse(error, language, privilegedAccount, requestId);
    throw error;
  }

  let context: PreparedChatContext;
  try {
    context = prepareChatContext({
      history: body?.messages,
      currentUserContent: validatedPrompt.providerPrompt,
      attachmentCount: validatedPrompt.attachments.length,
    });
  } catch (error) {
    if (error instanceof ChatContextValidationError) return contextErrorResponse(error, language, requestId);
    throw error;
  }

  const safetyInput = [
    context.summary ?? "",
    ...context.messages.filter((message) => message.role === "user").map((message) => message.content),
  ].filter(Boolean).join("\n\n");
  const safetyDecision = classifyPromptSafety(safetyInput, { allowCode: privilegedAccount });
  if (safetyDecision.blocked) {
    return jsonResponse({ error: safetyRefusal(language, safetyDecision.reason), requestId }, requestId, 403);
  }

  let rateLimitCookie: string | null = null;
  let rateLimitIdentifier = "";
  let demoReservationId = "";
  if (!privilegedAccount) {
    let allowance;
    try {
      const identity = await getRateLimitIdentity(request, sessionEmail);
      rateLimitCookie = identity.setCookie;
      rateLimitIdentifier = identity.identifier;
      allowance = await reserveDemoRequest(identity.identifier);
    } catch (error) {
      if (!(error instanceof DemoRateLimitUnavailableError || error instanceof RateLimitConfigurationError)) {
        console.warn("demo.rate_limit_unavailable", { requestId });
      }
      return jsonResponse(
        { error: language === "ru" ? "Демо временно недоступно. Попробуйте позже." : "The demo is temporarily unavailable. Please try again later.", requestId },
        requestId,
        503,
        rateLimitCookie,
      );
    }
    if (!allowance.allowed) {
      const retryAfter = allowance.resetAt ? Math.max(1, Math.ceil((allowance.resetAt - Date.now()) / 1000)) : undefined;
      const response = jsonResponse(
        { error: language === "ru" ? "Дневной лимит демо исчерпан. Попробуйте завтра." : "Daily demo limit reached. Please try again tomorrow.", retryAt: allowance.resetAt, requestId },
        requestId,
        429,
        rateLimitCookie,
      );
      if (retryAfter) response.headers.set("retry-after", String(retryAfter));
      return response;
    }
    demoReservationId = allowance.reservationId ?? "";
    if (!demoReservationId) {
      return jsonResponse(
        { error: language === "ru" ? "Демо временно недоступно. Попробуйте позже." : "The demo is temporarily unavailable. Please try again later.", requestId },
        requestId,
        503,
        rateLimitCookie,
      );
    }
  }

  let quotaSettlement: QuotaSettlement = "pending";
  const commitDemo = async () => {
    if (!demoReservationId || !rateLimitIdentifier || quotaSettlement !== "pending") return;
    quotaSettlement = "committed";
    try {
      await commitDemoRequest(rateLimitIdentifier, demoReservationId);
    } catch {
      console.warn("demo.rate_limit_commit_failed", { requestId });
    }
  };
  const releaseDemo = async () => {
    if (!demoReservationId || !rateLimitIdentifier || quotaSettlement !== "pending") return;
    quotaSettlement = "released";
    try {
      await releaseDemoRequest(rateLimitIdentifier, demoReservationId);
    } catch {
      console.warn("demo.rate_limit_release_failed", { requestId });
    }
  };

  const startedAt = Date.now();
  const requestedModel = model.name;

  if (!wantsStream) {
    const toolAugmentation = await prepareReadOnlyToolAugmentation({
      request,
      requestId,
      context,
      language,
      model,
      localArchive: body?.localArchive,
      signal: request.signal,
    });
    const fallbackPrompt = contextualFallbackPrompt(context, toolAugmentation.summary);
    try {
      const result = await generateWithNvidia({
        messages: context.messages,
        summary: toolAugmentation.summary,
        language,
        model,
        requestedReasoning,
        effort,
        allowCode: privilegedAccount,
        tone,
        signal: request.signal,
      });
      const generationResult = withContextMetadata(withToolCalls({
        answer: result.answer,
        reasoningUsed: result.reasoningUsed,
        provider: "nvidia",
        actualModel: result.actualModel,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
      }, toolAugmentation.traces), context);
      await commitDemo();
      const meta = createAiResponseMeta(generationResult, requestedModel, requestId, startedAt);
      logAiRequest(meta);
      return jsonResponse({ answer: generationResult.answer, meta }, requestId, 200, rateLimitCookie);
    } catch (error) {
      if (request.signal.aborted) {
        await releaseDemo();
        return jsonResponse({ error: "Request cancelled.", requestId }, requestId, 499, rateLimitCookie);
      }

      const reason = providerFailureReason(error);
      logAiProviderFailure({
        requestId,
        requestedModel,
        provider: "nvidia",
        status: typeof error === "object" && error && "status" in error && typeof error.status === "number" ? error.status : undefined,
        reason,
      });

      if (reason === "safety_output_blocked") {
        await commitDemo();
        const safetyResult = withContextMetadata(withToolCalls({
          answer: safetyRefusal(language),
          provider: "edge-fallback",
          actualModel: "safety-policy",
          fallbackReason: reason,
        }, toolAugmentation.traces), context);
        const meta = createAiResponseMeta(safetyResult, requestedModel, requestId, startedAt);
        logAiRequest(meta);
        return jsonResponse({ answer: safetyResult.answer, meta }, requestId, 200, rateLimitCookie);
      }

      const fallback = withContextMetadata(withToolCalls(await resolveFallback({
        prompt: fallbackPrompt,
        language,
        allowCode: privilegedAccount,
        requestId,
        requestedModel,
        primaryReason: reason,
        signal: request.signal,
      }), toolAugmentation.traces), context);
      if (fallback.provider === "clodex") await commitDemo();
      else await releaseDemo();
      const meta = createAiResponseMeta(fallback, requestedModel, requestId, startedAt);
      logAiRequest(meta);
      return jsonResponse({ answer: fallback.answer, meta }, requestId, 200, rateLimitCookie);
    }
  }

  const providerController = new AbortController();
  const abortProvider = () => providerController.abort(request.signal.reason);
  if (request.signal.aborted) abortProvider();
  else request.signal.addEventListener("abort", abortProvider, { once: true });

  const responseStream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let partialAnswer = "";
      let firstTokenAt = 0;
      let streamClosed = false;
      let toolCalls: AiToolCallTrace[] = [];
      let augmentedSummary = context.summary;
      const send = (event: Parameters<typeof encodeAiStreamEvent>[0], payload: unknown = {}) => {
        if (streamClosed) return false;
        try {
          controller.enqueue(encodeAiStreamEvent(event, payload));
          return true;
        } catch {
          streamClosed = true;
          return false;
        }
      };
      const close = () => {
        if (streamClosed) return;
        streamClosed = true;
        request.signal.removeEventListener("abort", abortProvider);
        try {
          controller.close();
        } catch {
          // The browser can close the stream before the provider finishes.
        }
      };

      send("start", {
        requestId,
        status: "connecting",
        context: {
          estimatedTokens: context.estimatedTokens,
          messages: context.includedMessageCount,
          attachments: context.attachmentCount,
          limit: context.contextLimit,
          compacted: context.compacted,
        },
      });

      try {
        const toolAugmentation = await prepareReadOnlyToolAugmentation({
          request,
          requestId,
          context,
          language,
          model,
          localArchive: body?.localArchive,
          signal: providerController.signal,
        });
        toolCalls = toolAugmentation.traces;
        augmentedSummary = toolAugmentation.summary;
        for (const trace of toolCalls) send("tool", trace);

        const result = await streamWithNvidia({
          messages: context.messages,
          summary: augmentedSummary,
          language,
          model,
          requestedReasoning,
          effort,
          allowCode: privilegedAccount,
          tone,
          signal: providerController.signal,
        }, (delta) => {
          if (!firstTokenAt) firstTokenAt = Date.now();
          partialAnswer += delta;
          send("delta", { text: delta });
        });

        const generationResult = withContextMetadata(withToolCalls({
          answer: result.answer,
          reasoningUsed: result.reasoningUsed,
          provider: "nvidia",
          actualModel: result.actualModel,
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
          timeToFirstTokenMs: firstTokenAt ? firstTokenAt - startedAt : undefined,
        }, toolCalls), context);
        const meta = createAiResponseMeta(generationResult, requestedModel, requestId, startedAt);
        await commitDemo();
        logAiRequest(meta);
        send("meta", meta);
        send("done", { requestId, stopped: false });
        close();
        return;
      } catch (error) {
        const aborted = providerController.signal.aborted || (error instanceof DOMException && error.name === "AbortError");
        if (aborted) {
          if (partialAnswer) await commitDemo();
          else await releaseDemo();
          if (partialAnswer) {
            const stoppedResult = withContextMetadata(withToolCalls({
              answer: partialAnswer,
              provider: "nvidia",
              actualModel: model.nvidiaModel ?? model.name,
              outputTokens: estimateTextTokens(partialAnswer),
              timeToFirstTokenMs: firstTokenAt ? firstTokenAt - startedAt : undefined,
              fallbackReason: "generation_stopped",
            }, toolCalls), context);
            const meta = createAiResponseMeta(stoppedResult, requestedModel, requestId, startedAt, 499);
            logAiRequest(meta);
            send("meta", meta);
          }
          send("done", { requestId, stopped: true, partial: Boolean(partialAnswer) });
          close();
          return;
        }

        const reason = providerFailureReason(error);
        logAiProviderFailure({
          requestId,
          requestedModel,
          provider: "nvidia",
          status: typeof error === "object" && error && "status" in error && typeof error.status === "number" ? error.status : undefined,
          reason,
        });

        if (partialAnswer) {
          await commitDemo();
          const partialResult = withContextMetadata(withToolCalls({
            answer: partialAnswer,
            provider: "nvidia",
            actualModel: model.nvidiaModel ?? model.name,
            fallbackReason: reason === "safety_output_blocked" ? reason : "nvidia_stream_interrupted",
            outputTokens: estimateTextTokens(partialAnswer),
            timeToFirstTokenMs: firstTokenAt ? firstTokenAt - startedAt : undefined,
          }, toolCalls), context);
          const meta = createAiResponseMeta(partialResult, requestedModel, requestId, startedAt, reason === "safety_output_blocked" ? 200 : 502);
          logAiRequest(meta);
          send("meta", meta);
          send("error", { error: streamInterruptedText(language), requestId, partial: true });
          send("done", { requestId, stopped: false, partial: true });
          close();
          return;
        }

        if (reason === "safety_output_blocked") {
          await commitDemo();
          const safetyResult = withContextMetadata(withToolCalls({
            answer: safetyRefusal(language),
            provider: "edge-fallback",
            actualModel: "safety-policy",
            fallbackReason: reason,
          }, toolCalls), context);
          const meta = createAiResponseMeta(safetyResult, requestedModel, requestId, startedAt);
          logAiRequest(meta);
          send("delta", { text: safetyResult.answer });
          send("meta", meta);
          send("done", { requestId, stopped: false });
          close();
          return;
        }

        const fallback = withContextMetadata(withToolCalls(await resolveFallback({
          prompt: contextualFallbackPrompt(context, augmentedSummary),
          language,
          allowCode: privilegedAccount,
          requestId,
          requestedModel,
          primaryReason: reason,
          signal: providerController.signal,
        }), toolCalls), context);
        if (fallback.provider === "clodex") await commitDemo();
        else await releaseDemo();
        const meta = createAiResponseMeta(fallback, requestedModel, requestId, startedAt);
        logAiRequest(meta);
        send("delta", { text: fallback.answer });
        send("meta", meta);
        send("done", { requestId, stopped: false });
        close();
      }
    },
    async cancel() {
      request.signal.removeEventListener("abort", abortProvider);
      providerController.abort("response_cancelled");
      await releaseDemo();
    },
  });

  return new Response(responseStream, { status: 200, headers: aiStreamHeaders(requestId, rateLimitCookie) });
}
