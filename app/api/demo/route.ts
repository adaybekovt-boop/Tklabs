import { auth } from "@/auth";
import { generateWithClodex } from "@/lib/ai/providers/clodex";
import { generateWithNvidia, isUnsafeNvidiaAnswer } from "@/lib/ai/providers/nvidia";
import { logAiProviderFailure, logAiRequest } from "@/lib/ai/logging";
import { newRequestId } from "@/lib/ai/provider-http";
import type { AiGenerationResult, AiResponseMeta } from "@/lib/ai/types";
import { classifyPromptSafety, safetyRefusal } from "@/lib/ai-safety";
import { promptValidationMessage, PromptValidationError, validateAndBuildProviderPrompt } from "@/lib/chat-prompt";
import { DemoRateLimitUnavailableError, consumeDemoRequest } from "@/lib/demo-rate-limit-access";
import { isClodexEnabled } from "@/lib/feature-flags";
import { getErmaModel, type ErmaTone } from "@/lib/models/server";
import { getRateLimitIdentity, RateLimitConfigurationError } from "@/lib/rate-limit-identity";
import { isPrivilegedAiEmail } from "@/lib/privileged-access";
import { parseJsonBody, RequestBodyTooLargeError } from "@/lib/request-body";
import { isTrustedRequestOrigin } from "@/lib/request-security";

export const runtime = "edge";

const CLODEX_MODEL = "claude-clodex-5";

type Language = "ru" | "en";
type ReasoningEffort = "low" | "medium" | "high";
type ChatRequest = { prompt?: unknown; locale?: unknown; model?: unknown; reason?: unknown; effort?: unknown; tone?: unknown; attachments?: unknown };

function normalizeEffort(value: unknown): ReasoningEffort {
  return value === "low" || value === "high" ? value : "medium";
}

function normalizeTone(value: unknown): ErmaTone {
  return value === "character" ? "character" : "professional";
}

function responseFor(language: Language) {
  return language === "ru"
    ? "Выбранная модель временно недоступна. Ответ сформирован резервным режимом."
    : "The selected model is temporarily unavailable. This answer was produced by a fallback mode.";
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

function resultMeta(result: AiGenerationResult, requestedModel: string, requestId: string, startedAt: number, status: number): AiResponseMeta {
  return {
    requestId,
    requestedModel,
    actualProvider: result.provider,
    actualModel: result.actualModel,
    latencyMs: Date.now() - startedAt,
    httpStatus: status,
    ...(result.fallbackReason ? { fallbackReason: result.fallbackReason } : {}),
  };
}

function resultResponse(result: AiGenerationResult, requestedModel: string, requestId: string, startedAt: number, setCookie?: string | null) {
  const meta = resultMeta(result, requestedModel, requestId, startedAt, 200);
  logAiRequest(meta);
  return jsonResponse({ answer: result.answer, meta }, requestId, 200, setCookie);
}

async function resolveFallback(input: {
  prompt: string;
  language: Language;
  allowCode: boolean;
  requestId: string;
  requestedModel: string;
  primaryReason: string;
}) : Promise<AiGenerationResult> {
  const apiKey = process.env.CLODEX_API_KEY?.trim();
  if (isClodexEnabled() && apiKey) {
    try {
      const answer = await generateWithClodex(input.prompt, apiKey, CLODEX_MODEL, input.language, input.allowCode);
      return { answer, provider: "clodex", actualModel: CLODEX_MODEL, fallbackReason: input.primaryReason };
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

  return {
    answer: responseFor(input.language),
    provider: "edge-fallback",
    actualModel: "local-fallback",
    fallbackReason: isClodexEnabled() ? `${input.primaryReason};clodex_unavailable` : `${input.primaryReason};clodex_disabled`,
  };
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
  const requestedReasoning = body?.reason === true;
  const effort = normalizeEffort(body?.effort);
  const tone = normalizeTone(body?.tone);
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

  const { providerPrompt } = validatedPrompt;
  const safetyDecision = classifyPromptSafety(providerPrompt, { allowCode: privilegedAccount });
  if (safetyDecision.blocked) {
    return jsonResponse({ error: safetyRefusal(language, safetyDecision.reason), requestId }, requestId, 403);
  }

  let rateLimitCookie: string | null = null;
  if (!privilegedAccount) {
    let allowance;
    try {
      const identity = await getRateLimitIdentity(request, sessionEmail);
      rateLimitCookie = identity.setCookie;
      allowance = await consumeDemoRequest(identity.identifier);
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
  }

  const startedAt = Date.now();
  const requestedModel = model.name;
  try {
    const result = await generateWithNvidia({
      prompt: providerPrompt,
      language,
      model,
      requestedReasoning,
      effort,
      allowCode: privilegedAccount,
      tone,
    });
    if (isUnsafeNvidiaAnswer(result.answer, privilegedAccount)) {
      const safetyResult: AiGenerationResult = {
        answer: safetyRefusal(language),
        provider: "edge-fallback",
        actualModel: "safety-policy",
        fallbackReason: "safety_output_blocked",
      };
      return resultResponse(safetyResult, requestedModel, requestId, startedAt, rateLimitCookie);
    }
    return resultResponse({ answer: result.answer, provider: "nvidia", actualModel: result.actualModel }, requestedModel, requestId, startedAt, rateLimitCookie);
  } catch (error) {
    const reason = error instanceof Error && error.message === "nvidia_not_configured" ? "nvidia_not_configured" : "nvidia_request_failed";
    logAiProviderFailure({
      requestId,
      requestedModel,
      provider: "nvidia",
      status: typeof error === "object" && error && "status" in error && typeof error.status === "number" ? error.status : undefined,
      reason,
    });
    const fallback = await resolveFallback({ prompt: providerPrompt, language, allowCode: privilegedAccount, requestId, requestedModel, primaryReason: reason });
    return resultResponse(fallback, requestedModel, requestId, startedAt, rateLimitCookie);
  }
}
