import { useEffect, useMemo, useReducer, useRef, useState } from "react";

import { DEFAULT_CONTEXT_LIMIT_TOKENS, estimateMessagesTokens, type ChatContextMessage } from "@/lib/ai/context";
import type { AiResponseMeta } from "@/lib/ai/types";
import type { Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/i18n";
import type { ArchivedMessage } from "@/lib/local-archive";
import type { ChatInputSubmitMeta } from "@/components/ui/ai-chat-input";
import type { ChatMessage } from "@/components/playground/MessageList";

type Tone = "professional" | "character" | "erma";
export type ChatRequestStatus = "idle" | "connecting" | "analyzing" | "generating" | "completed" | "error" | "stopped";

export type ChatContextStats = {
  estimatedTokens: number;
  messages: number;
  attachments: number;
  limit: number;
  compacted: boolean;
};

type RequestState = { status: ChatRequestStatus; requestId: string | null; assistantId: string | null };
type RequestAction =
  | { type: "start"; requestId: string; assistantId: string }
  | { type: "connected" }
  | { type: "delta" }
  | { type: "completed" }
  | { type: "error" }
  | { type: "stopped" }
  | { type: "reset" };

type ActiveConversation = {
  prompt: string;
  model: string;
  assistantId: string;
  requestId: string;
};

type StreamPayload = Record<string, unknown>;

function requestReducer(state: RequestState, action: RequestAction): RequestState {
  switch (action.type) {
    case "start": return { status: "connecting", requestId: action.requestId, assistantId: action.assistantId };
    case "connected": return { ...state, status: "analyzing" };
    case "delta": return { ...state, status: "generating" };
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
  const body = payload && typeof payload === "object" && "retryAfter" in payload
    ? Number((payload as { retryAfter?: unknown }).retryAfter)
    : 0;
  const value = Number.isFinite(header) && header > 0 ? header : body;
  return Number.isFinite(value) && value > 0 ? Math.min(3600, Math.max(1, Math.ceil(value))) : undefined;
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

function parseEventBlock(block: string) {
  let event = "message";
  const data: string[] = [];
  for (const line of block.split(/\r?\n/)) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
  }
  if (!data.length) return null;
  try {
    return { event, payload: JSON.parse(data.join("\n")) as StreamPayload };
  } catch {
    return null;
  }
}

function toContextMessages(messages: ChatMessage[]): ChatContextMessage[] {
  return messages.flatMap((message) => {
    if (message.error || message.excludedFromContext || !message.content.trim()) return [];
    return [{ role: message.role, content: message.content.trim() }];
  });
}

function contextStatsFromMessages(messages: ChatMessage[]): ChatContextStats {
  const contextMessages = toContextMessages(messages);
  return {
    estimatedTokens: estimateMessagesTokens(contextMessages),
    messages: contextMessages.length,
    attachments: 0,
    limit: DEFAULT_CONTEXT_LIMIT_TOKENS,
    compacted: false,
  };
}

function contextStatsFromPayload(payload: unknown): ChatContextStats | null {
  if (!payload || typeof payload !== "object") return null;
  const context = payload as Partial<ChatContextStats>;
  if (
    typeof context.estimatedTokens !== "number"
    || typeof context.messages !== "number"
    || typeof context.attachments !== "number"
    || typeof context.limit !== "number"
  ) return null;
  return {
    estimatedTokens: Math.max(0, Math.round(context.estimatedTokens)),
    messages: Math.max(0, Math.round(context.messages)),
    attachments: Math.max(0, Math.round(context.attachments)),
    limit: Math.max(1, Math.round(context.limit)),
    compacted: context.compacted === true,
  };
}

export function useChatRequest(options: {
  locale: Locale;
  tone: Tone;
  reasonEnabled: boolean;
  promptLimit: number;
  currentModel: string;
  saveConversation: (prompt: string, model: string, messages: ArchivedMessage[]) => void;
}) {
  const text = getDictionary(options.locale);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [serverContextStats, setServerContextStats] = useState<ChatContextStats | null>(null);
  const [requestState, dispatch] = useReducer(requestReducer, { status: "idle", requestId: null, assistantId: null });
  const activeRequestRef = useRef<AbortController | null>(null);
  const activeConversationRef = useRef<ActiveConversation | null>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPending = requestState.status === "connecting" || requestState.status === "analyzing" || requestState.status === "generating";
  const localContextStats = useMemo(() => contextStatsFromMessages(messages), [messages]);
  const contextStats = isPending && serverContextStats ? serverContextStats : localContextStats;

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  function clearWatchdog() {
    if (watchdogRef.current) clearTimeout(watchdogRef.current);
    watchdogRef.current = null;
  }

  function clearActiveRequest() {
    activeRequestRef.current = null;
    activeConversationRef.current = null;
    clearWatchdog();
  }

  function saveUpdatedMessages(conversation: ActiveConversation, update: (messages: ChatMessage[]) => ChatMessage[]) {
    setMessages((current) => {
      const next = update(current);
      options.saveConversation(conversation.prompt, conversation.model, next as ArchivedMessage[]);
      return next;
    });
  }

  function appendAssistant(assistantId: string, update: (message: ChatMessage) => ChatMessage) {
    setMessages((current) => current.map((message) => (message.id === assistantId ? update(message) : message)));
  }

  function armWatchdog(controller: AbortController, conversation: ActiveConversation) {
    clearWatchdog();
    watchdogRef.current = setTimeout(() => {
      if (activeRequestRef.current !== controller) return;
      controller.abort();
      clearActiveRequest();
      saveUpdatedMessages(conversation, (current) => current.map((message) => message.id === conversation.assistantId
        ? {
            ...message,
            content: message.content ? `${message.content}\n\n${text.chat.networkError}` : text.chat.networkError,
            error: !message.content,
            requestId: conversation.requestId,
          }
        : message));
      dispatch({ type: "error" });
    }, 120_000);
  }

  function stopGeneration() {
    const conversation = activeConversationRef.current;
    if (!conversation) return;
    activeRequestRef.current?.abort();
    clearActiveRequest();
    saveUpdatedMessages(conversation, (current) => current.map((message) => message.id === conversation.assistantId
      ? {
          ...message,
          content: message.content ? `${message.content}\n\n${text.chat.generationStopped}` : text.chat.generationStopped,
          error: false,
        }
      : message));
    dispatch({ type: "stopped" });
  }

  function applyMetaToContext(meta: AiResponseMeta) {
    if (typeof meta.inputTokens !== "number" && typeof meta.contextMessageCount !== "number") return;
    setServerContextStats((current) => ({
      estimatedTokens: typeof meta.inputTokens === "number"
        ? Math.max(0, Math.round(meta.inputTokens))
        : current?.estimatedTokens ?? localContextStats.estimatedTokens,
      messages: typeof meta.contextMessageCount === "number"
        ? Math.max(0, Math.round(meta.contextMessageCount))
        : current?.messages ?? localContextStats.messages,
      attachments: typeof meta.contextAttachmentCount === "number"
        ? Math.max(0, Math.round(meta.contextAttachmentCount))
        : current?.attachments ?? 0,
      limit: typeof meta.contextLimit === "number"
        ? Math.max(1, Math.round(meta.contextLimit))
        : current?.limit ?? DEFAULT_CONTEXT_LIMIT_TOKENS,
      compacted: meta.contextCompacted === true,
    }));
  }

  async function consumeEventStream(response: Response, controller: AbortController, conversation: ActiveConversation) {
    if (!response.body) throw new Error("The streaming response has no body.");
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let receivedDone = false;
    let receivedContent = false;
    let streamError = "";

    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });
      const blocks = buffer.split(/\r?\n\r?\n/);
      buffer = done ? "" : (blocks.pop() ?? "");

      for (const block of blocks) {
        const parsed = parseEventBlock(block);
        if (!parsed) continue;
        armWatchdog(controller, conversation);

        if (parsed.event === "start") {
          dispatch({ type: "connected" });
          const stats = contextStatsFromPayload(parsed.payload.context);
          if (stats) setServerContextStats(stats);
          const providerRequestId = typeof parsed.payload.requestId === "string" ? parsed.payload.requestId : conversation.requestId;
          appendAssistant(conversation.assistantId, (message) => ({ ...message, requestId: providerRequestId }));
          continue;
        }

        if (parsed.event === "delta") {
          const delta = typeof parsed.payload.text === "string" ? parsed.payload.text : "";
          if (!delta) continue;
          receivedContent = true;
          dispatch({ type: "delta" });
          appendAssistant(conversation.assistantId, (message) => ({ ...message, content: `${message.content}${delta}` }));
          continue;
        }

        if (parsed.event === "meta" && isResponseMeta(parsed.payload)) {
          const meta = parsed.payload;
          appendAssistant(conversation.assistantId, (message) => ({ ...message, requestId: meta.requestId, meta }));
          applyMetaToContext(meta);
          continue;
        }

        if (parsed.event === "error") {
          streamError = typeof parsed.payload.error === "string" ? parsed.payload.error : text.chat.networkError;
          continue;
        }

        if (parsed.event === "done") receivedDone = true;
      }
      if (done) break;
    }

    if (!receivedContent) throw new Error("The AI response was empty.");
    saveUpdatedMessages(conversation, (current) => current.map((message) => message.id === conversation.assistantId && streamError
      ? { ...message, content: `${message.content}\n\n${streamError}`, error: false }
      : message));
    if (!receivedDone || streamError) dispatch({ type: "error" });
    else dispatch({ type: "completed" });
  }

  async function runRequest(
    prompt: string,
    submitMeta: ChatInputSubmitMeta,
    preserveUserMessage = false,
    historyOverride?: ChatMessage[],
  ) {
    const requestId = crypto.randomUUID();
    const assistantId = crypto.randomUUID();
    const controller = new AbortController();
    const history = toContextMessages(historyOverride ?? messagesRef.current);
    const conversation: ActiveConversation = { prompt, model: submitMeta.model, assistantId, requestId };

    setServerContextStats(null);
    if (preserveUserMessage) {
      setMessages((current) => [...current, {
        id: assistantId,
        role: "assistant",
        content: "",
        requestId,
        retryPrompt: prompt,
        retryModel: submitMeta.model,
      }]);
    } else {
      const userMessage: ChatMessage = { id: crypto.randomUUID(), role: "user", content: prompt };
      setMessages((current) => [...current, userMessage, {
        id: assistantId,
        role: "assistant",
        content: "",
        requestId,
        retryPrompt: prompt,
        retryModel: submitMeta.model,
      }]);
    }

    activeRequestRef.current = controller;
    activeConversationRef.current = conversation;
    dispatch({ type: "start", requestId, assistantId });
    armWatchdog(controller, conversation);

    try {
      const endpoint = submitMeta.model.startsWith("clodex:") ? "/api/clodex" : "/api/demo";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "text/event-stream, application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          prompt,
          messages: history,
          model: submitMeta.model,
          locale: options.locale,
          reasonEnabled: options.reasonEnabled,
          effort: submitMeta.effort,
          tone: options.tone,
          attachments: submitMeta.attachments,
        }),
      });
      armWatchdog(controller, conversation);

      if (!response.ok) {
        const payload = await response.json().catch(() => null) as {
          error?: unknown;
          requestId?: unknown;
          retryAfter?: unknown;
        } | null;
        const fallback = response.status === 401 ? text.chat.authExpired : `${text.chat.apiError} ${response.status}`;
        const errorText = typeof payload?.error === "string" ? payload.error : fallback;
        appendAssistant(assistantId, (message) => ({
          ...message,
          content: errorText,
          error: true,
          requestId: typeof payload?.requestId === "string" ? payload.requestId : requestId,
          retryAfterSeconds: safeRetrySeconds(response, payload),
        }));
        dispatch({ type: "error" });
        return;
      }

      const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
      if (contentType.includes("text/event-stream")) {
        await consumeEventStream(response, controller, conversation);
        return;
      }

      dispatch({ type: "connected" });
      const payload = await response.json().catch(() => null) as {
        answer?: unknown;
        meta?: unknown;
      } | null;
      const assistantContent = typeof payload?.answer === "string" ? payload.answer.trim() : "";
      if (!assistantContent) throw new Error("The AI response was empty.");
      const responseMeta = isResponseMeta(payload?.meta) ? payload.meta : undefined;
      if (responseMeta) applyMetaToContext(responseMeta);
      saveUpdatedMessages(conversation, (current) => current.map((message) => message.id === assistantId
        ? {
            ...message,
            content: assistantContent,
            requestId: responseMeta?.requestId ?? requestId,
            ...(responseMeta ? { meta: responseMeta } : {}),
          }
        : message));
      dispatch({ type: "completed" });
    } catch (error) {
      if (isAbortError(error)) return;
      saveUpdatedMessages(conversation, (current) => current.map((message) => message.id === assistantId
        ? {
            ...message,
            content: message.content ? `${message.content}\n\n${text.chat.networkError}` : text.chat.networkError,
            error: !message.content,
            requestId,
          }
        : message));
      dispatch({ type: "error" });
    } finally {
      if (activeRequestRef.current === controller) clearActiveRequest();
    }
  }

  function handleSubmit(prompt: string, submitMeta: ChatInputSubmitMeta): boolean {
    if (!prompt || prompt.length > options.promptLimit || isPending) return false;
    void runRequest(prompt, submitMeta);
    return true;
  }

  function retryMessage(message: ChatMessage) {
    if (isPending || !message.retryPrompt || !message.retryModel) return;
    const current = messagesRef.current;
    const assistantIndex = current.findIndex((entry) => entry.id === message.id);
    let history = assistantIndex >= 0 ? current.slice(0, assistantIndex) : current.filter((entry) => entry.id !== message.id);
    const latest = history[history.length - 1];
    if (latest?.role === "user" && latest.content.trim() === message.retryPrompt.trim()) history = history.slice(0, -1);
    setMessages((entries) => entries.filter((entry) => entry.id !== message.id));
    void runRequest(message.retryPrompt, { model: message.retryModel, effort: "medium", attachments: [] }, true, history);
  }

  function toggleMessageContext(messageId: string) {
    if (isPending) return;
    setServerContextStats(null);
    setMessages((current) => {
      const next = current.map((message) => message.id === messageId
        ? { ...message, excludedFromContext: !message.excludedFromContext }
        : message);
      const firstPrompt = next.find((message) => message.role === "user")?.content ?? "Conversation";
      options.saveConversation(firstPrompt, options.currentModel, next as ArchivedMessage[]);
      return next;
    });
  }

  function clearMessages() {
    activeRequestRef.current?.abort();
    clearActiveRequest();
    dispatch({ type: "reset" });
    setServerContextStats(null);
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

  return {
    messages,
    setMessages,
    isPending,
    requestStatus: requestState.status,
    contextStats,
    handleSubmit,
    stopGeneration,
    retryMessage,
    toggleMessageContext,
    clearMessages,
  };
}
