import { auth } from "@/auth";
import { ChatContextValidationError, prepareChatContext, type PreparedChatContext } from "@/lib/ai/context";
import { parsePersonalMemoryPacket, renderPersonalMemoryContext } from "@/lib/ai/personal-memory";
import { newRequestId } from "@/lib/ai/provider-http";
import { classifyPromptSafety, safetyRefusal } from "@/lib/ai-safety";
import { PromptValidationError, validateAndBuildProviderPrompt, type ChatAttachment, type ChatImageAttachment } from "@/lib/chat-prompt";
import { requestedErmaName, selectErmaModel, type ErmaModel, type ErmaTone } from "@/lib/models/server";
import { isPrivilegedAiEmail } from "@/lib/privileged-access";
import { parseJsonBody, RequestBodyTooLargeError } from "@/lib/request-body";
import { isTrustedRequestOrigin } from "@/lib/request-security";
import { normalizeEffort, normalizeLanguage, normalizeTone, type ChatRequest, type Language, type ReasoningEffort } from "./contracts";
import { contextErrorResponse, jsonResponse, promptErrorResponse } from "./http";
import { createDemoQuota, type DemoQuota } from "./quota";

const DEMO_JSON_BODY_LIMIT_BYTES = 2_500_000;

export type PreparedDemoRequest = {
  request: Request;
  body: ChatRequest;
  prompt: string;
  requestId: string;
  language: Language;
  model: ErmaModel;
  requestedReasoning: boolean;
  effort: ReasoningEffort;
  tone: ErmaTone;
  privilegedAccount: boolean;
  context: PreparedChatContext;
  personalMemoryContext: string;
  documents: ChatAttachment[];
  images: ChatImageAttachment[];
  quota: DemoQuota;
  rateLimitCookie: string | null;
  startedAt: number;
  requestedModel: string;
};

export type DemoRequestPreparation = { response: Response } | { prepared: PreparedDemoRequest };

async function sessionEmail() {
  try {
    const session = await auth();
    return session?.user?.email?.trim().toLowerCase() ?? "";
  } catch {
    return "";
  }
}

// Coarse, body-free language guess for the quota check below, which must run before the
// (up to 2.5MB) request body is read — an exhausted-quota response shouldn't cost a full
// body parse. The real, body-derived language takes over for every response after that.
function languageFromHeader(request: Request): Language {
  return request.headers.get("accept-language")?.trim().toLowerCase().startsWith("en") ? "en" : "ru";
}

export async function prepareDemoRequest(request: Request): Promise<DemoRequestPreparation> {
  const requestId = newRequestId();
  if (!isTrustedRequestOrigin(request)) return { response: jsonResponse({ error: "Request origin is not allowed.", requestId }, requestId, 403) };

  const email = await sessionEmail();
  const privilegedAccount = isPrivilegedAiEmail(email);

  const quotaResult = await createDemoQuota({ request, requestId, language: languageFromHeader(request), sessionEmail: email, privileged: privilegedAccount });
  if ("response" in quotaResult) return quotaResult;

  let body: ChatRequest | null;
  try {
    body = await parseJsonBody<ChatRequest>(request, DEMO_JSON_BODY_LIMIT_BYTES);
  } catch (error) {
    await quotaResult.quota.release();
    if (error instanceof RequestBodyTooLargeError) return { response: jsonResponse({ error: "Request body is too large.", requestId }, requestId, 413) };
    throw error;
  }

  const normalizedBody = body ?? {};
  const language = normalizeLanguage(normalizedBody.locale);
  const requestedModelKey = typeof normalizedBody.model === "string" ? normalizedBody.model : undefined;
  const requestedReasoning = normalizedBody.reasonEnabled === true;
  const effort = normalizeEffort(normalizedBody.effort);
  const tone = normalizeTone(normalizedBody.tone);

  let validatedPrompt;
  try {
    validatedPrompt = validateAndBuildProviderPrompt(normalizedBody.prompt, normalizedBody.attachments, { privileged: privilegedAccount });
  } catch (error) {
    await quotaResult.quota.release();
    if (error instanceof PromptValidationError) return { response: promptErrorResponse(error, language, privilegedAccount, requestId) };
    throw error;
  }

  const model = selectErmaModel(requestedModelKey, validatedPrompt.prompt, {
    requestedReasoning,
    effort,
    hasImages: validatedPrompt.images.length > 0,
  });
  const requestedModel = requestedErmaName(requestedModelKey);

  let context: PreparedChatContext;
  try {
    context = prepareChatContext({
      history: normalizedBody.messages,
      currentUserContent: validatedPrompt.providerPrompt,
      attachmentCount: validatedPrompt.attachments.length + validatedPrompt.images.length,
    });
  } catch (error) {
    await quotaResult.quota.release();
    if (error instanceof ChatContextValidationError) return { response: contextErrorResponse(error, language, requestId) };
    throw error;
  }

  const personalMemory = parsePersonalMemoryPacket(normalizedBody.personalMemory);
  const personalMemoryContext = renderPersonalMemoryContext(personalMemory, validatedPrompt.prompt);

  const safetyInput = [
    context.summary ?? "",
    ...context.messages.filter((message) => message.role === "user").map((message) => message.content),
  ].filter(Boolean).join("\n\n");
  const safetyDecision = classifyPromptSafety(safetyInput, { allowCode: privilegedAccount });
  if (safetyDecision.blocked) {
    await quotaResult.quota.release();
    return { response: jsonResponse({ error: safetyRefusal(language, safetyDecision.reason), requestId }, requestId, 403) };
  }

  return {
    prepared: {
      request,
      body: normalizedBody,
      prompt: validatedPrompt.prompt,
      requestId,
      language,
      model,
      requestedReasoning,
      effort,
      tone,
      privilegedAccount,
      context,
      personalMemoryContext,
      documents: validatedPrompt.attachments,
      images: validatedPrompt.images,
      quota: quotaResult.quota,
      rateLimitCookie: quotaResult.quota.cookie,
      startedAt: Date.now(),
      requestedModel,
    },
  };
}
