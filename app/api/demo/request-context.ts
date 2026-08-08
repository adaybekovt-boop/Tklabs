import { auth } from "@/auth";
import { ChatContextValidationError, prepareChatContext, type PreparedChatContext } from "@/lib/ai/context";
import { newRequestId } from "@/lib/ai/provider-http";
import { classifyPromptSafety, safetyRefusal } from "@/lib/ai-safety";
import { PromptValidationError, validateAndBuildProviderPrompt, type ChatAttachment } from "@/lib/chat-prompt";
import { requestedErmaName, selectErmaModel, type ErmaModel, type ErmaTone } from "@/lib/models/server";
import { isPrivilegedAiEmail } from "@/lib/privileged-access";
import { parseJsonBody, RequestBodyTooLargeError } from "@/lib/request-body";
import { isTrustedRequestOrigin } from "@/lib/request-security";
import { normalizeEffort, normalizeLanguage, normalizeTone, type ChatRequest, type Language, type ReasoningEffort } from "./contracts";
import { contextErrorResponse, jsonResponse, promptErrorResponse } from "./http";
import { createDemoQuota, type DemoQuota } from "./quota";

export type PreparedDemoRequest = { request: Request; body: ChatRequest; requestId: string; language: Language; model: ErmaModel; requestedReasoning: boolean; effort: ReasoningEffort; tone: ErmaTone; privilegedAccount: boolean; context: PreparedChatContext; documents: ChatAttachment[]; quota: DemoQuota; rateLimitCookie: string | null; startedAt: number; requestedModel: string };
export type DemoRequestPreparation = { response: Response } | { prepared: PreparedDemoRequest };
async function sessionEmail() { try { const session = await auth(); return session?.user?.email?.trim().toLowerCase() ?? ""; } catch { return ""; } }

export async function prepareDemoRequest(request: Request): Promise<DemoRequestPreparation> {
  const requestId = newRequestId();
  if (!isTrustedRequestOrigin(request)) return { response: jsonResponse({ error: "Request origin is not allowed.", requestId }, requestId, 403) };
  let body: ChatRequest | null;
  try { body = await parseJsonBody<ChatRequest>(request); } catch (error) { if (error instanceof RequestBodyTooLargeError) return { response: jsonResponse({ error: "Request body is too large.", requestId }, requestId, 413) }; throw error; }

  const normalizedBody = body ?? {};
  const language = normalizeLanguage(normalizedBody.locale);
  const requestedModelKey = typeof normalizedBody.model === "string" ? normalizedBody.model : undefined;
  const requestedReasoning = normalizedBody.reasonEnabled === true;
  const effort = normalizeEffort(normalizedBody.effort);
  const tone = normalizeTone(normalizedBody.tone);
  const email = await sessionEmail();
  const privilegedAccount = isPrivilegedAiEmail(email);

  let validatedPrompt;
  try { validatedPrompt = validateAndBuildProviderPrompt(normalizedBody.prompt, normalizedBody.attachments, { privileged: privilegedAccount }); }
  catch (error) { if (error instanceof PromptValidationError) return { response: promptErrorResponse(error, language, privilegedAccount, requestId) }; throw error; }

  const model = selectErmaModel(requestedModelKey, validatedPrompt.prompt, { requestedReasoning, effort });
  const requestedModel = requestedErmaName(requestedModelKey);

  let context: PreparedChatContext;
  try { context = prepareChatContext({ history: normalizedBody.messages, currentUserContent: validatedPrompt.providerPrompt, attachmentCount: validatedPrompt.attachments.length }); }
  catch (error) { if (error instanceof ChatContextValidationError) return { response: contextErrorResponse(error, language, requestId) }; throw error; }

  const safetyInput = [context.summary ?? "", ...context.messages.filter((message) => message.role === "user").map((message) => message.content)].filter(Boolean).join("\n\n");
  const safetyDecision = classifyPromptSafety(safetyInput, { allowCode: privilegedAccount });
  if (safetyDecision.blocked) return { response: jsonResponse({ error: safetyRefusal(language, safetyDecision.reason), requestId }, requestId, 403) };

  const quotaResult = await createDemoQuota({ request, requestId, language, sessionEmail: email, privileged: privilegedAccount });
  if ("response" in quotaResult) return quotaResult;

  return { prepared: { request, body: normalizedBody, requestId, language, model, requestedReasoning, effort, tone, privilegedAccount, context, documents: validatedPrompt.attachments, quota: quotaResult.quota, rateLimitCookie: quotaResult.quota.cookie, startedAt: Date.now(), requestedModel } };
}
