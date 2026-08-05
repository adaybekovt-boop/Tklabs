import { auth } from "@/auth";
import { generateWithClodex } from "@/lib/ai/providers/clodex";
import { logAiProviderFailure, logAiRequest } from "@/lib/ai/logging";
import { newRequestId } from "@/lib/ai/provider-http";
import { createAiResponseMeta } from "@/lib/ai/response";
import type { AiGenerationResult } from "@/lib/ai/types";
import { AccountAccessUnavailableError, consumeClodexAccess, releaseClodexAccess } from "@/lib/account-access";
import { classifyPromptSafety, safetyRefusal } from "@/lib/ai-safety";
import { promptValidationMessage, PromptValidationError, validateAndBuildProviderPrompt } from "@/lib/chat-prompt";
import { getClodexModel } from "@/lib/models/clodex-server";
import { isClodexEnabled } from "@/lib/feature-flags";
import { isPrivilegedAiEmail } from "@/lib/privileged-access";
import { parseJsonBody, RequestBodyTooLargeError } from "@/lib/request-body";
import { isTrustedRequestOrigin } from "@/lib/request-security";

export const runtime = "edge";

type Language = "ru" | "en";
type ChatRequest = { prompt?: unknown; locale?: unknown; model?: unknown; attachments?: unknown };

function responseHeaders(requestId: string) {
  return new Headers({ "cache-control": "no-store", "x-request-id": requestId });
}

function jsonResponse(payload: unknown, requestId: string, status = 200) {
  return Response.json(payload, { status, headers: responseHeaders(requestId) });
}

function errorText(language: Language, type: "access" | "limit" | "provider" | "configuration") {
  const ru = {
    access: "Сначала активируйте доступ к моделям в профиле.",
    limit: "Лимит Clodex исчерпан. Попробуйте снова после сброса окна.",
    provider: "Clodex не ответил. Попробуйте ещё раз.",
    configuration: "Доступ к моделям пока настраивается.",
  };
  const en = {
    access: "Activate model access in your profile first.",
    limit: "The Clodex limit is exhausted. Try again when the window resets.",
    provider: "Clodex did not respond. Please try again.",
    configuration: "Model access is being configured.",
  };
  return (language === "ru" ? ru : en)[type];
}

export async function POST(request: Request) {
  const requestId = newRequestId();
  if (!isClodexEnabled()) return jsonResponse({ error: "Clodex access is disabled.", requestId }, requestId, 404);
  if (!isTrustedRequestOrigin(request)) return jsonResponse({ error: "Request origin is not allowed.", requestId }, requestId, 403);

  let session;
  try {
    session = await auth();
  } catch {
    return jsonResponse({ error: "Authentication service is temporarily unavailable.", requestId }, requestId, 503);
  }
  const email = session?.user?.email?.trim().toLowerCase() ?? "";
  if (!email) return jsonResponse({ error: "Authentication required.", requestId }, requestId, 401);
  const privilegedAccount = isPrivilegedAiEmail(email);

  let body: ChatRequest | null;
  try {
    body = await parseJsonBody<ChatRequest>(request);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return jsonResponse({ error: "Request body is too large.", requestId }, requestId, 413);
    throw error;
  }

  const language: Language = body?.locale === "en" ? "en" : "ru";
  const model = getClodexModel(typeof body?.model === "string" ? body.model : undefined);
  let validatedPrompt;
  try {
    validatedPrompt = validateAndBuildProviderPrompt(body?.prompt, body?.attachments, { privileged: privilegedAccount });
  } catch (error) {
    if (error instanceof PromptValidationError) {
      return jsonResponse(
        { error: promptValidationMessage(error.code, language, privilegedAccount), code: error.code, requestId },
        requestId,
        error.status,
      );
    }
    throw error;
  }
  if (!model) return jsonResponse({ error: errorText(language, "access"), requestId }, requestId, 403);

  const { providerPrompt } = validatedPrompt;
  const safetyDecision = classifyPromptSafety(providerPrompt, { allowCode: privilegedAccount });
  if (safetyDecision.blocked) {
    return jsonResponse({ error: safetyRefusal(language, safetyDecision.reason), requestId }, requestId, 403);
  }

  const apiKey = process.env.CLODEX_API_KEY?.trim();
  if (!apiKey) return jsonResponse({ error: errorText(language, "configuration"), requestId }, requestId, 503);

  let allowanceReserved = false;
  let allowanceReservationId = "";
  if (!privilegedAccount) {
    let allowance;
    try {
      allowance = await consumeClodexAccess(email);
    } catch (error) {
      if (error instanceof AccountAccessUnavailableError) return jsonResponse({ error: errorText(language, "configuration"), requestId }, requestId, 503);
      console.warn("clodex.access_unavailable", { requestId });
      return jsonResponse({ error: errorText(language, "configuration"), requestId }, requestId, 503);
    }
    if (!allowance.allowed) {
      const status = allowance.error === "limit_reached" ? 429 : 403;
      const response = jsonResponse(
        { error: errorText(language, allowance.error === "limit_reached" ? "limit" : "access"), retryAt: allowance.retryAt, requestId },
        requestId,
        status,
      );
      if (allowance.retryAt) response.headers.set("retry-after", String(Math.max(1, Math.ceil((allowance.retryAt - Date.now()) / 1000))));
      return response;
    }
    allowanceReserved = true;
    allowanceReservationId = allowance.reservationId ?? "";
  }

  const startedAt = Date.now();
  try {
    const { answer, thinking } = await generateWithClodex(providerPrompt, apiKey, model.providerModel, language, privilegedAccount, request.signal);
    const meta = createAiResponseMeta({ answer, provider: "clodex", actualModel: model.providerModel }, model.name, requestId, startedAt);
    logAiRequest(meta);
    return jsonResponse({ answer, ...(thinking ? { thinking } : {}), meta }, requestId);
  } catch (error) {
    if (allowanceReserved && allowanceReservationId) {
      try {
        await releaseClodexAccess(email, allowanceReservationId);
      } catch {
        console.warn("clodex.access_release_failed", { requestId });
      }
    }
    if (request.signal.aborted) return jsonResponse({ error: "Request cancelled.", requestId }, requestId, 499);
    const isSafetyBlock = error instanceof Error && error.message === "clodex_output_blocked";
    const result: AiGenerationResult = isSafetyBlock
      ? { answer: safetyRefusal(language), provider: "edge-fallback", actualModel: "safety-policy", fallbackReason: "safety_output_blocked" }
      : { answer: errorText(language, "provider"), provider: "edge-fallback", actualModel: "provider-error", fallbackReason: "clodex_request_failed" };
    const meta = createAiResponseMeta(result, model.name, requestId, startedAt, isSafetyBlock ? 200 : 502);
    logAiProviderFailure({ requestId, requestedModel: model.name, provider: "clodex", reason: isSafetyBlock ? "output_blocked" : "request_failed" });
    logAiRequest(meta);
    return jsonResponse({ answer: result.answer, meta }, requestId, isSafetyBlock ? 200 : 502);
  }
}
