import type { ChatContextValidationError } from "@/lib/ai/context";
import { promptValidationMessage, type PromptValidationError } from "@/lib/chat-prompt";

import type { Language } from "./contracts";

export function responseHeaders(requestId: string, setCookie?: string | null) {
  const headers = new Headers({ "cache-control": "no-store", "x-request-id": requestId });
  if (setCookie) headers.set("set-cookie", setCookie);
  return headers;
}

export function jsonResponse(payload: unknown, requestId: string, status = 200, setCookie?: string | null) {
  return Response.json(payload, { status, headers: responseHeaders(requestId, setCookie) });
}

export function promptErrorResponse(error: PromptValidationError, language: Language, privileged: boolean, requestId: string) {
  return jsonResponse(
    { error: promptValidationMessage(error.code, language, privileged), code: error.code, requestId },
    requestId,
    error.status,
  );
}

export function contextErrorResponse(error: ChatContextValidationError, language: Language, requestId: string) {
  const errorText = error.status === 413
    ? language === "ru"
      ? "Контекст диалога превышает допустимый лимит. Начните новый диалог или исключите часть сообщений."
      : "The conversation context exceeds the allowed limit. Start a new chat or exclude some messages."
    : language === "ru"
      ? "История диалога содержит некорректные сообщения."
      : "The conversation history contains invalid messages.";
  return jsonResponse({ error: errorText, code: "invalid_context", requestId }, requestId, error.status);
}
