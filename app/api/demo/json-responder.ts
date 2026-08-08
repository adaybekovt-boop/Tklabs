import { logAiProviderFailure, logAiRequest } from "@/lib/ai/logging";
import { generateWithNvidia } from "@/lib/ai/providers/nvidia";
import { createAiResponseMeta } from "@/lib/ai/response";
import { prepareReadOnlyToolAugmentation } from "@/lib/ai/tools/route-tools";
import { safetyRefusal } from "@/lib/ai-safety";

import { contextualFallbackPrompt, providerFailureReason, resolveFallback, withContextMetadata, withToolCalls } from "./fallback";
import { jsonResponse } from "./http";
import type { PreparedDemoRequest } from "./request-context";

export async function respondWithDemoJson(input: PreparedDemoRequest) {
  const { request, body, requestId, language, model, requestedReasoning, effort, tone, privilegedAccount, context, documents, quota, rateLimitCookie, startedAt, requestedModel } = input;

  const toolAugmentation = await prepareReadOnlyToolAugmentation({ request, requestId, context, language, model, localArchive: body.localArchive, documents, allowCodeSandbox: privilegedAccount, signal: request.signal });
  const fallbackPrompt = contextualFallbackPrompt(context, toolAugmentation.summary);

  try {
    const result = await generateWithNvidia({ messages: context.messages, summary: toolAugmentation.summary, language, model, requestedReasoning, effort, allowCode: privilegedAccount, tone, signal: request.signal });
    const generationResult = withContextMetadata(withToolCalls({ answer: result.answer, reasoningUsed: result.reasoningUsed, provider: "nvidia", actualModel: result.actualModel, inputTokens: result.inputTokens, outputTokens: result.outputTokens }, toolAugmentation.traces), context);
    await quota.commit();
    const meta = createAiResponseMeta(generationResult, requestedModel, requestId, startedAt);
    logAiRequest(meta);
    return jsonResponse({ answer: generationResult.answer, meta }, requestId, 200, rateLimitCookie);
  } catch (error) {
    if (request.signal.aborted) { await quota.release(); return jsonResponse({ error: "Request cancelled.", requestId }, requestId, 499, rateLimitCookie); }
    const reason = providerFailureReason(error);
    logAiProviderFailure({ requestId, requestedModel, provider: "nvidia", status: typeof error === "object" && error && "status" in error && typeof error.status === "number" ? error.status : undefined, reason });

    if (reason === "safety_output_blocked") {
      await quota.commit();
      const safetyResult = withContextMetadata(withToolCalls({ answer: safetyRefusal(language), provider: "edge-fallback", actualModel: "safety-policy", fallbackReason: reason }, toolAugmentation.traces), context);
      const meta = createAiResponseMeta(safetyResult, requestedModel, requestId, startedAt);
      logAiRequest(meta);
      return jsonResponse({ answer: safetyResult.answer, meta }, requestId, 200, rateLimitCookie);
    }

    const fallback = withContextMetadata(withToolCalls(await resolveFallback({ prompt: fallbackPrompt, language, allowCode: privilegedAccount, requestId, requestedModel, primaryReason: reason, signal: request.signal }), toolAugmentation.traces), context);
    if (fallback.provider === "clodex") await quota.commit(); else await quota.release();
    const meta = createAiResponseMeta(fallback, requestedModel, requestId, startedAt);
    logAiRequest(meta);
    return jsonResponse({ answer: fallback.answer, meta }, requestId, 200, rateLimitCookie);
  }
}
