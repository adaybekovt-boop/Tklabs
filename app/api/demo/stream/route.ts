import { auth } from "@/auth";
import { buildChatContext } from "@/lib/ai/chat-context";
import { logAiProviderFailure, logAiRequest } from "@/lib/ai/logging";
import { generateWithClodex } from "@/lib/ai/providers/clodex";
import { generateWithNvidia } from "@/lib/ai/providers/nvidia";
import { newRequestId } from "@/lib/ai/provider-http";
import { createAiResponseMeta, localFallbackResult } from "@/lib/ai/response";
import { encodeAiStreamEvent, splitTextForValidatedStream } from "@/lib/ai/sse";
import type { AiGenerationResult } from "@/lib/ai/types";
import { classifyPromptSafety, evaluateAssistantContent, safetyRefusal } from "@/lib/ai-safety";
import { promptValidationMessage, PromptValidationError, validateAndBuildProviderPrompt } from "@/lib/chat-prompt";
import { DemoRateLimitUnavailableError, commitDemoRequest, releaseDemoRequest, reserveDemoRequest } from "@/lib/demo-rate-limit-access";
import { isClodexEnabled } from "@/lib/feature-flags";
import { getClodexModelConfig } from "@/lib/models/clodex-server";
import { getErmaModel, type ErmaTone } from "@/lib/models/server";
import { isPrivilegedAiEmail } from "@/lib/privileged-access";
import { getRateLimitIdentity, RateLimitConfigurationError } from "@/lib/rate-limit-identity";
import { parseJsonBody, RequestBodyTooLargeError } from "@/lib/request-body";
import { isTrustedRequestOrigin } from "@/lib/request-security";

export const runtime = "edge";

type Language = "ru" | "en";
type ReasoningEffort = "low" | "medium" | "high";
type ChatRequest = {
  prompt?: unknown;
  locale?: unknown;
  model?: unknown;
  reasonEnabled?: unknown;
  effort?: unknown;
  tone?: unknown;
  attachments?: unknown;
  history?: unknown;
};

function normalizeEffort(value: unknown): ReasoningEffort {
  return value === "low" || value === "high" ? value : "medium";
}

function normalizeTone(value: unknown): ErmaTone {
  if (value === "character") return "character";
  if (value === "erma") return "erma";
  return "professional";
}

function jsonResponse(payload: unknown, requestId: string, status = 200, setCookie?: string | null) {
  const headers = new Headers({ "cache-control": "no-store", "x-request-id": requestId });
  if (setCookie) headers.set("set-cookie", setCookie);
  return Response.json(payload, { status, headers });
}

function streamResponse(input: {
  requestId: string;
  setCookie?: string | null;
  context: ReturnType<typeof buildChatContext>;
  run: () => Promise<{ result: AiGenerationResult; requestedModel: string; startedAt: number }>;
}) {
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(encodeAiStreamEvent({
        type: "start",
        requestId: input.requestId,
        contextMessages: input.context.messages.length,
        contextCharacters: input.context.characters,
        contextTruncated: input.context.truncated,
      }));
      try {
        const { result, requestedModel, startedAt } = await input.run();
        const meta = createAiResponseMeta(result, requestedModel, input.requestId, startedAt);
        logAiRequest(meta);
        for (const text of splitTextForValidatedStream(result.answer)) {
          controller.enqueue(encodeAiStreamEvent({ type: "delta", text }));
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
        controller.enqueue(encodeAiStreamEvent({ type: "meta", meta }));
        controller.enqueue(encodeAiStreamEvent({ type: "done" }));
      } catch (error) {
        const message = error instanceof Error && error.message === "Request cancelled."
          ? "Request cancelled."
          : "The AI request failed. Please retry.";
        controller.enqueue(encodeAiStreamEvent({ type: "error", error: message, requestId: input.requestId }));
      } finally {
        controller.close();
      }
    },
  });

  const headers = new Headers({
    "cache-control": "no-store, no-transform",
    "content-type": "text/event-stream; charset=utf-8",
    "x-accel-buffering": "no",
    "x-request-id": input.requestId,
  });
  if (input.setCookie) headers.set("set-cookie", input.setCookie);
  return new Response(stream, { status: 200, headers });
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
  const effort = normalizeEffort(body?.effort);
  const tone = normalizeTone(body?.tone);
  const requestedReasoning = body?.reasonEnabled === true;

  let sessionEmail = "";
  try {
    const session = await auth();
    sessionEmail = session?.user?.email?.trim().toLowerCase() ?? "";
  } catch {
    // Guest demo requests remain usable when optional auth is absent.
  }
  const privilegedAccount = isPrivilegedAiEmail(sessionEmail);

  let validatedPrompt;
  try {
    validatedPrompt = validateAndBuildProviderPrompt(body?.prompt, body?.attachments, { privileged: privilegedAccount });
  } catch (error) {
    if (error instanceof PromptValidationError) {
      return jsonResponse({
        error: promptValidationMessage(error.code, language, privilegedAccount),
        code: error.code,
        requestId,
      }, requestId, error.status);
    }
    throw error;
  }

  const context = buildChatContext(body?.history, { privileged: privilegedAccount });
  const { providerPrompt } = validatedPrompt;
  const safetyDecision = classifyPromptSafety(providerPrompt, { allowCode: privilegedAccount });
  if (safetyDecision.blocked) {
    return jsonResponse({ error: safetyRefusal(language, safetyDecision.reason), requestId }, requestId, 403);
  }

  let rateLimitCookie: string | null = null;
  let rateLimitIdentifier = "";
  let demoReservationId = "";
  if (!privilegedAccount) {
    try {
      const identity = await getRateLimitIdentity(request, sessionEmail);
      rateLimitCookie = identity.setCookie;
      rateLimitIdentifier = identity.identifier;
      const allowance = await reserveDemoRequest(identity.identifier);
      if (!allowance.allowed) {
        const retryAfter = allowance.resetAt ? Math.max(1, Math.ceil((allowance.resetAt - Date.now()) / 1000)) : undefined;
        const response = jsonResponse({
          error: language === "ru" ? "Дневной лимит демо исчерпан. Попробуйте завтра." : "Daily demo limit reached. Please try again tomorrow.",
          retryAt: allowance.resetAt,
          requestId,
        }, requestId, 429, rateLimitCookie);
        if (retryAfter) response.headers.set("retry-after", String(retryAfter));
        return response;
      }
      demoReservationId = allowance.reservationId ?? "";
      if (!demoReservationId) throw new DemoRateLimitUnavailableError();
    } catch (error) {
      if (!(error instanceof DemoRateLimitUnavailableError || error instanceof RateLimitConfigurationError)) {
        console.warn("demo.stream.rate_limit_unavailable", { requestId });
      }
      return jsonResponse({
        error: language === "ru" ? "Демо временно недоступно. Попробуйте позже." : "The demo is temporarily unavailable. Please try again later.",
        requestId,
      }, requestId, 503, rateLimitCookie);
    }
  }

  const commitDemo = async () => {
    if (!demoReservationId || !rateLimitIdentifier) return;
    try { await commitDemoRequest(rateLimitIdentifier, demoReservationId); }
    catch { console.warn("demo.stream.rate_limit_commit_failed", { requestId }); }
  };
  const releaseDemo = async () => {
    if (!demoReservationId || !rateLimitIdentifier) return;
    try { await releaseDemoRequest(rateLimitIdentifier, demoReservationId); }
    catch { console.warn("demo.stream.rate_limit_release_failed", { requestId }); }
  };

  const requestedModel = model.name;
  return streamResponse({
    requestId,
    setCookie: rateLimitCookie,
    context,
    run: async () => {
      const startedAt = Date.now();
      try {
        const result = await generateWithNvidia({
          prompt: providerPrompt,
          language,
          model,
          requestedReasoning,
          effort,
          allowCode: privilegedAccount,
          tone,
          history: context.messages,
          signal: request.signal,
        });
        const evaluation = evaluateAssistantContent({ answer: result.answer }, { allowCode: privilegedAccount });
        if (evaluation.verdict !== "ok") {
          await commitDemo();
          return {
            startedAt,
            requestedModel,
            result: {
              answer: safetyRefusal(language),
              provider: "edge-fallback",
              actualModel: "safety-policy",
              fallbackReason: "safety_output_blocked",
            },
          };
        }
        await commitDemo();
        return {
          startedAt,
          requestedModel,
          result: { answer: evaluation.answer, reasoningUsed: result.reasoningUsed, provider: "nvidia", actualModel: result.actualModel },
        };
      } catch (error) {
        if (request.signal.aborted) {
          await releaseDemo();
          throw new Error("Request cancelled.");
        }
        const reason = error instanceof Error && error.message === "nvidia_not_configured"
          ? "nvidia_not_configured"
          : "nvidia_request_failed";
        logAiProviderFailure({
          requestId,
          requestedModel,
          provider: "nvidia",
          status: typeof error === "object" && error && "status" in error && typeof error.status === "number" ? error.status : undefined,
          reason,
        });

        const apiKey = process.env.CLODEX_API_KEY?.trim();
        const fallbackModel = getClodexModelConfig({ requireRuntimeConfig: true })?.[0];
        if (isClodexEnabled() && apiKey && fallbackModel) {
          try {
            const fallback = await generateWithClodex(
              providerPrompt,
              apiKey,
              fallbackModel.providerModel,
              fallbackModel.maxTokens,
              language,
              privilegedAccount,
              request.signal,
              context.messages,
            );
            await commitDemo();
            return {
              startedAt,
              requestedModel,
              result: {
                answer: fallback.answer,
                reasoningUsed: fallback.reasoningUsed,
                provider: "clodex",
                actualModel: fallback.actualModel,
                fallbackReason: reason,
              },
            };
          } catch (fallbackError) {
            logAiProviderFailure({
              requestId,
              requestedModel,
              provider: "clodex",
              status: typeof fallbackError === "object" && fallbackError && "status" in fallbackError && typeof fallbackError.status === "number" ? fallbackError.status : undefined,
              reason: fallbackError instanceof Error ? fallbackError.message : "clodex_failed",
            });
          }
        }

        await releaseDemo();
        return {
          startedAt,
          requestedModel,
          result: localFallbackResult(language, isClodexEnabled() ? `${reason};clodex_unavailable` : `${reason};clodex_disabled`),
        };
      }
    },
  });
}
