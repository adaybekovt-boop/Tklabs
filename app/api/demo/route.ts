import { auth } from "@/auth";
import {
  ChatContextValidationError,
  estimateTextTokens,
  prepareChatContext,
  type PreparedChatContext,
} from "@/lib/ai/context";
import { logAiProviderFailure, logAiRequest } from "@/lib/ai/logging";
import { newRequestId } from "@/lib/ai/provider-http";
import { generateWithNvidia, streamWithNvidia } from "@/lib/ai/providers/nvidia";
import { createAiResponseMeta } from "@/lib/ai/response";
import { aiStreamHeaders, encodeAiStreamEvent } from "@/lib/ai/sse";
import { prepareReadOnlyToolAugmentation } from "@/lib/ai/tools/route-tools";
import type { AiToolCallTrace } from "@/lib/ai/types";
import { classifyPromptSafety, safetyRefusal } from "@/lib/ai-safety";
import { PromptValidationError, validateAndBuildProviderPrompt } from "@/lib/chat-prompt";
import { getErmaModel } from "@/lib/models/server";
import { isPrivilegedAiEmail } from "@/lib/privileged-access";
import { parseJsonBody, RequestBodyTooLargeError } from "@/lib/request-body";
import { isTrustedRequestOrigin } from "@/lib/request-security";

import {
  acceptsEventStream,
  normalizeEffort,
  normalizeLanguage,
  normalizeTone,
  type ChatRequest,
} from "./contracts";
import {
  contextualFallbackPrompt,
  providerFailureReason,
  resolveFallback,
  streamInterruptedText,
  withContextMetadata,
  withToolCalls,
} from "./fallback";
import { contextErrorResponse, jsonResponse, promptErrorResponse } from "./http";
import { createDemoQuota } from "./quota";

export const runtime = "edge";

export async function POST(request: Request) {
  const requestId = newRequestId();
  if (!isTrustedRequestOrigin(request)) {
    return jsonResponse({ error: "Request origin is not allowed.", requestId }, requestId, 403);
  }

  let body: ChatRequest | null;
  try {
    body = await parseJsonBody<ChatRequest>(request);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return jsonResponse({ error: "Request body is too large.", requestId }, requestId, 413);
    }
    throw error;
  }

  const language = normalizeLanguage(body?.locale);
  const model = getErmaModel(typeof body?.model === "string" ? body.model : undefined);
  const requestedReasoning = body?.reasonEnabled === true;
  const effort = normalizeEffort(body?.effort);
  const tone = normalizeTone(body?.tone);
  const wantsStream = acceptsEventStream(request);

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
    validatedPrompt = validateAndBuildProviderPrompt(body?.prompt, body?.attachments, {
      privileged: privilegedAccount,
    });
  } catch (error) {
    if (error instanceof PromptValidationError) {
      return promptErrorResponse(error, language, privilegedAccount, requestId);
    }
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
    if (error instanceof ChatContextValidationError) {
      return contextErrorResponse(error, language, requestId);
    }
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

  const quotaResult = await createDemoQuota({
    request,
    requestId,
    language,
    sessionEmail,
    privileged: privilegedAccount,
  });
  if ("response" in quotaResult) return quotaResult.response;
  const { quota } = quotaResult;
  const rateLimitCookie = quota.cookie;

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
      await quota.commit();
      const meta = createAiResponseMeta(generationResult, requestedModel, requestId, startedAt);
      logAiRequest(meta);
      return jsonResponse({ answer: generationResult.answer, meta }, requestId, 200, rateLimitCookie);
    } catch (error) {
      if (request.signal.aborted) {
        await quota.release();
        return jsonResponse({ error: "Request cancelled.", requestId }, requestId, 499, rateLimitCookie);
      }

      const reason = providerFailureReason(error);
      logAiProviderFailure({
        requestId,
        requestedModel,
        provider: "nvidia",
        status: typeof error === "object" && error && "status" in error && typeof error.status === "number"
          ? error.status
          : undefined,
        reason,
      });

      if (reason === "safety_output_blocked") {
        await quota.commit();
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
      if (fallback.provider === "clodex") await quota.commit();
      else await quota.release();
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
        await quota.commit();
        logAiRequest(meta);
        send("meta", meta);
        send("done", { requestId, stopped: false });
        close();
        return;
      } catch (error) {
        const aborted = providerController.signal.aborted
          || (error instanceof DOMException && error.name === "AbortError");
        if (aborted) {
          if (partialAnswer) await quota.commit();
          else await quota.release();
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
          status: typeof error === "object" && error && "status" in error && typeof error.status === "number"
            ? error.status
            : undefined,
          reason,
        });

        if (partialAnswer) {
          await quota.commit();
          const partialResult = withContextMetadata(withToolCalls({
            answer: partialAnswer,
            provider: "nvidia",
            actualModel: model.nvidiaModel ?? model.name,
            fallbackReason: reason === "safety_output_blocked" ? reason : "nvidia_stream_interrupted",
            outputTokens: estimateTextTokens(partialAnswer),
            timeToFirstTokenMs: firstTokenAt ? firstTokenAt - startedAt : undefined,
          }, toolCalls), context);
          const meta = createAiResponseMeta(
            partialResult,
            requestedModel,
            requestId,
            startedAt,
            reason === "safety_output_blocked" ? 200 : 502,
          );
          logAiRequest(meta);
          send("meta", meta);
          send("error", { error: streamInterruptedText(language), requestId, partial: true });
          send("done", { requestId, stopped: false, partial: true });
          close();
          return;
        }

        if (reason === "safety_output_blocked") {
          await quota.commit();
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
        if (fallback.provider === "clodex") await quota.commit();
        else await quota.release();
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
      await quota.release();
    },
  });

  return new Response(responseStream, {
    status: 200,
    headers: aiStreamHeaders(requestId, rateLimitCookie),
  });
}
