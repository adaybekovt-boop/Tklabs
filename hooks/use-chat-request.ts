import { useEffect, useReducer, useRef, useState } from "react";

import type { AiResponseMeta } from "@/lib/ai/types";
import type { Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/i18n";
import type { ArchivedMessage } from "@/lib/local-archive";
import type { ChatInputSubmitMeta } from "@/components/ui/ai-chat-input";
import type { ChatMessage } from "@/components/playground/MessageList";

type Tone = "professional" | "character" | "erma";
export type ChatRequestStatus = "idle" | "preparing" | "generating" | "completed" | "error" | "stopped";

type RequestState = { status: ChatRequestStatus; requestId: string | null; assistantId: string | null };
type RequestAction =
  | { type: "start"; requestId: string; assistantId: string }
  | { type: "generating" }
  | { type: "completed" }
  | { type: "error" }
  | { type: "stopped" }
  | { type: "reset" };

function requestReducer(state: RequestState, action: RequestAction): RequestState {
  switch (action.type) {
    case "start": return { status: "preparing", requestId: action.requestId, assistantId: action.assistantId };
    case "generating": return { ...state, status: "generating" };
    case "completed": return { ...state, status: "completed", requestId: null, assistantId: null };
    case "error": return { ...state, status: "error", requestId: null, assistantId: null };
    case "stopped": return { ...state, status: "stopped", requestId: null, assistantId: null };
    case "reset": return { status: "idle", requestId: null, assistantId: null };
  }
}

function isResponseMeta(value: unknown): value is AiResponseMeta {
  if (!value || typeof value !== "object") return false;
  const meta = value as Partial<AiResponseMeta>;
  return typeof meta.requestId === "string"
    && typeof meta.requestedModel === "string"
    && (meta.actualProvider === "nvidia" || meta.actualProvider === "clodex" || meta.actualProvider === "edge-fallback")
    && typeof meta.actualModel === "string"
    && typeof meta.latencyMs === "number"
    && typeof meta.httpStatus === "number";
}

function safeRetrySeconds(response: Response, payload: unknown) {
  const header = Number(response.headers.get("retry-after"));
  const body = payload && typeof payload === "object" && "retryAfter" in payload ? Number((payload as { retryAfter?: unknown }).retryAfter) : 0;
  const value = Number.isFinite(header) && header > 0 ? header : body;
  return Number.isFinite(value) && value > 0 ? Math.min(3600, Math.max(1, Math.ceil(value))) : undefined;
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

export function useChatRequest(options: {
  locale: Locale;
  tone: Tone;
  reasonEnabled: boolean;
  promptLimit: number;
  saveConversation: (prompt: string, model: string, messages: ArchivedMessage[]) => void;
}) {
  const text = getDictionary(options.locale);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [requestState, dispatch] = useReducer(requestReducer, { status: "idle", requestId: null, assistantId: null });
  const activeRequestRef = useRef<AbortController | null>(null);
  const activeConversationRef = useRef<{ prompt: string; model: string; effort: ChatInputSubmitMeta["effort"]; attachments: ChatInputSubmitMeta["attachments"]; assistantId: string; requestId: string } | null>(null);
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPending = requestState.status === "preparing" || requestState.status === "generating";

  function clearActiveRequest() {
    activeRequestRef.current = null;
    activeConversationRef.current = null;
    if (watchdogRef.current) clearTimeout(watchdogRef.current);
    watchdogRef.current = null;
  }

  function appendAssistant(assistantId: string, update: (message: ChatMessage) => ChatMessage) {
    setMessages((current) => current.map((message) => (message.id === assistantId ? update(message) : message)));
  }

  function stopGeneration() {
    const activeConversation = activeConversationRef.current;
    if (!activeConversation) return;
    activeRequestRef.current?.abort();
    clearActiveRequest();
    appendAssistant(activeConversation.assistantId, (message) => ({
      ...message,
      content: message.content ? `${message.content}\n\n${text.chat.generationStopped}` : text.chat.generationStopped,
      error: false,
    }));
    setMessages((current) => {
      options.saveConversation(activeConversation.prompt, activeConversation.model, current as ArchivedMessage[]);
      return current;
    });
    dispatch({ type: "stopped" });
  }

  async function runRequest(prompt: string, submitMeta: ChatInputSubmitMeta, preserveUserMessage = false) {
    const requestId = crypto.randomUUID();
    const assistantId = crypto.randomUUID();
    const controller = new AbortController();
    const conversation = { prompt, model: submitMeta.model, effort: submitMeta.effort, attachments: submitMeta.attachments, assistantId, requestId };
    if (preserveUserMessage) {
      setMessages((current) => [...current, { id: assistantId, role: "assistant", content: "", requestId, retryPrompt: prompt, retryModel: submitMeta.model }]);
    } else {
      const userMessage: ChatMessage = { id: crypto.randomUUID(), role: "user", content: prompt };
      setMessages((current) => [...current, userMessage, { id: assistantId, role: "assistant", content: "", requestId, retryPrompt: prompt, retryModel: submitMeta.model }]);
    }
    activeRequestRef.current = controller;
    activeConversationRef.current = conversation;
    dispatch({ type: "start", requestId, assistantId });
    watchdogRef.current = setTimeout(() => {
      if (activeRequestRef.current !== controller) return;
      controller.abort();
      clearActiveRequest();
      appendAssistant(assistantId, (message) => ({ ...message, content: text.chat.networkError, error: true, requestId }));
      dispatch({ type: "error" });
    }, 120_000);

    try {
      const endpoint = submitMeta.model.startsWith("clodex:") ? "/api/clodex" : "/api/demo";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ prompt, model: submitMeta.model, locale: options.locale, reasonEnabled: options.reasonEnabled, effort: submitMeta.effort, tone: options.tone, attachments: submitMeta.attachments }),
      });
      dispatch({ type: "generating" });
      const payload = await response.json().catch(() => null) as { answer?: unknown; meta?: unknown; error?: unknown; requestId?: unknown; retryAfter?: unknown } | null;
      if (!response.ok) {
        const fallback = response.status === 401 ? text.chat.authExpired : `${text.chat.apiError} ${response.status}`;
        const errorText = typeof payload?.error === "string" ? payload.error : fallback;
        appendAssistant(assistantId, (message) => ({ ...message, content: errorText, error: true, requestId: typeof payload?.requestId === "string" ? payload.requestId : requestId, retryAfterSeconds: safeRetrySeconds(response, payload) }));
        dispatch({ type: "error" });
        return;
      }
      const assistantContent = typeof payload?.answer === "string" ? payload.answer.trim() : "";
      if (!assistantContent) throw new Error("The AI response was empty.");
      const responseMeta = isResponseMeta(payload?.meta) ? payload.meta : undefined;
      setMessages((current) => {
        const next = current.map((message) => message.id === assistantId ? { ...message, content: assistantContent, requestId: responseMeta?.requestId ?? requestId, ...(responseMeta ? { meta: responseMeta } : {}) } : message);
        options.saveConversation(prompt, submitMeta.model, next as ArchivedMessage[]);
        return next;
      });
      dispatch({ type: "completed" });
    } catch (error) {
      if (isAbortError(error)) return;
      appendAssistant(assistantId, (message) => ({ ...message, content: text.chat.networkError, error: true, requestId }));
      dispatch({ type: "error" });
    } finally {
      if (activeRequestRef.current === controller) {
        clearActiveRequest();
        if (requestState.status === "preparing" || requestState.status === "generating") dispatch({ type: "reset" });
      }
    }
  }

  async function handleSubmit(prompt: string, submitMeta: ChatInputSubmitMeta) {
    if (!prompt || prompt.length > options.promptLimit || isPending) return;
    await runRequest(prompt, submitMeta);
  }

  function retryMessage(message: ChatMessage) {
    if (isPending || !message.retryPrompt || !message.retryModel) return;
    setMessages((current) => current.filter((entry) => entry.id !== message.id));
    void runRequest(message.retryPrompt, { model: message.retryModel, effort: "medium", attachments: [] }, true);
  }

  function clearMessages() {
    activeRequestRef.current?.abort();
    clearActiveRequest();
    dispatch({ type: "reset" });
    setMessages([]);
  }

  useEffect(() => {
    const stopOnPageHide = () => activeRequestRef.current?.abort();
    window.addEventListener("pagehide", stopOnPageHide);
    return () => {
      window.removeEventListener("pagehide", stopOnPageHide);
      activeRequestRef.current?.abort();
      clearActiveRequest();
    };
  }, []);

  return { messages, setMessages, isPending, requestStatus: requestState.status, handleSubmit, stopGeneration, retryMessage, clearMessages };
}
