import { useEffect, useMemo, useReducer, useRef, useState } from "react";

import { DEFAULT_CONTEXT_LIMIT_TOKENS } from "@/lib/ai/context";
import { shouldIncludeLocalArchive } from "@/lib/ai/tools/intents";
import type { AiResponseMeta } from "@/lib/ai/types";
import type { ChatResponseMode } from "@/lib/chat-modes";
import { getDictionary, type Locale } from "@/lib/i18n";
import type { ArchivedMessage } from "@/lib/local-archive";
import { buildLocalArchiveSearchIndex } from "@/lib/local-archive-search";
import type { ChatInputSubmitMeta } from "@/components/ui/ai-chat-input";
import type { ChatMessage } from "@/components/playground/MessageList";

import {
  type ActiveConversation,
  type ChatContextStats,
  type ChatTone,
  type RunConfiguration,
} from "./chat-request/contracts";
import {
  contextStatsFromMessages,
  modeAttachments,
  modelForPrompt,
  responseSnapshot,
  toContextMessages,
} from "./chat-request/persistence";
import {
  INITIAL_REQUEST_STATE,
  isRequestPending,
  requestReducer,
} from "./chat-request/state";
import {
  consumeAiEventStream,
  isAbortError,
  isResponseMeta,
  safeRetrySeconds,
} from "./chat-request/transport";

// Response metadata, including actualProvider, is validated by chat-request/transport.
export type { ChatContextStats, ChatRequestStatus } from "./chat-request/contracts";

export function useChatRequest(options: {
  locale: Locale;
  tone: ChatTone;
  reasonEnabled: boolean;
  responseMode: ChatResponseMode;
  promptLimit: number;
  currentModel: string;
  saveConversation: (prompt: string, model: string, messages: ArchivedMessage[]) => void;
}) {
  const text = getDictionary(options.locale);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [serverContextStats, setServerContextStats] = useState<ChatContextStats | null>(null);
  const [requestState, dispatch] = useReducer(requestReducer, INITIAL_REQUEST_STATE);
  const activeRequestRef = useRef<AbortController | null>(null);
  const activeConversationRef = useRef<ActiveConversation | null>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPending = isRequestPending(requestState);
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

  function saveUpdatedMessages(
    conversation: ActiveConversation,
    update: (messages: ChatMessage[]) => ChatMessage[],
  ) {
    setMessages((current) => {
      const next = update(current);
      options.saveConversation(conversation.prompt, conversation.model, next as ArchivedMessage[]);
      return next;
    });
  }

  function saveCurrentMessages(next: ChatMessage[], model = options.currentModel) {
    const firstPrompt = next.find((message) => message.role === "user")?.content ?? "Conversation";
    options.saveConversation(firstPrompt, model, next as ArchivedMessage[]);
  }

  function appendAssistant(assistantId: string, update: (message: ChatMessage) => ChatMessage) {
    setMessages((current) => current.map((message) => (
      message.id === assistantId ? update(message) : message
    )));
  }

  function armWatchdog(controller: AbortController, conversation: ActiveConversation) {
    clearWatchdog();
    watchdogRef.current = setTimeout(() => {
      if (activeRequestRef.current !== controller) return;
      controller.abort();
      clearActiveRequest();
      saveUpdatedMessages(conversation, (current) => current.map((message) => (
        message.id === conversation.assistantId
          ? {
              ...message,
              content: message.content
                ? `${message.content}\n\n${text.chat.networkError}`
                : text.chat.networkError,
              error: !message.content,
              requestId: conversation.requestId,
            }
          : message
      )));
      dispatch({ type: "error" });
    }, 120_000);
  }

  function stopGeneration() {
    const conversation = activeConversationRef.current;
    if (!conversation) return;
    activeRequestRef.current?.abort();
    clearActiveRequest();
    saveUpdatedMessages(conversation, (current) => current.map((message) => (
      message.id === conversation.assistantId
        ? {
            ...message,
            content: message.content || text.chat.generationStopped,
            error: false,
            stopped: true,
          }
        : message
    )));
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

  async function consumeEventStream(
    response: Response,
    controller: AbortController,
    conversation: ActiveConversation,
  ) {
    const outcome = await consumeAiEventStream(response, conversation, {
      heartbeat: () => armWatchdog(controller, conversation),
      connected: (stats, providerRequestId) => {
        dispatch({ type: "connected" });
        if (stats) setServerContextStats(stats);
        appendAssistant(conversation.assistantId, (message) => ({
          ...message,
          requestId: providerRequestId,
        }));
      },
      delta: (delta) => {
        dispatch({ type: "delta" });
        appendAssistant(conversation.assistantId, (message) => ({
          ...message,
          content: `${message.content}${delta}`,
        }));
      },
      meta: (meta) => {
        appendAssistant(conversation.assistantId, (message) => ({
          ...message,
          requestId: meta.requestId,
          meta,
        }));
        applyMetaToContext(meta);
      },
      networkError: text.chat.networkError,
    });

    if (!outcome.receivedContent) throw new Error("The AI response was empty.");
    if (outcome.streamError) {
      saveUpdatedMessages(conversation, (current) => current.map((message) => (
        message.id === conversation.assistantId
          ? {
              ...message,
              content: `${message.content}\n\n${outcome.streamError}`,
              error: false,
            }
          : message
      )));
    }
    dispatch({ type: !outcome.receivedDone || outcome.streamError ? "error" : "completed" });
  }

  async function runRequest(
    prompt: string,
    submitMeta: ChatInputSubmitMeta,
    configuration: RunConfiguration = {},
  ) {
    const requestId = crypto.randomUUID();
    const assistantId = configuration.reuseAssistantId ?? crypto.randomUUID();
    const controller = new AbortController();
    const history = toContextMessages(configuration.historyOverride ?? messagesRef.current);
    const requestModel = modelForPrompt(
      submitMeta.model,
      prompt,
      options.reasonEnabled,
      submitMeta.effort,
    );
    const conversation: ActiveConversation = {
      prompt,
      model: submitMeta.model,
      assistantId,
      requestId,
    };
    const localArchive = shouldIncludeLocalArchive(prompt) ? buildLocalArchiveSearchIndex() : [];

    setServerContextStats(null);
    if (configuration.reuseAssistantId) {
      setMessages((current) => current.map((message) => (
        message.id === assistantId
          ? {
              ...message,
              content: "",
              error: false,
              stopped: false,
              requestId,
              retryPrompt: prompt,
              retryModel: submitMeta.model,
              versions: configuration.previousVersions,
              comparison: undefined,
              meta: undefined,
            }
          : message
      )));
    } else {
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: prompt,
      };
      setMessages((current) => [
        ...current,
        userMessage,
        {
          id: assistantId,
          role: "assistant",
          content: "",
          requestId,
          retryPrompt: prompt,
          retryModel: submitMeta.model,
        },
      ]);
    }

    activeRequestRef.current = controller;
    activeConversationRef.current = conversation;
    dispatch({ type: "start", requestId, assistantId });
    armWatchdog(controller, conversation);

    try {
      const endpoint = requestModel.startsWith("clodex:") ? "/api/clodex" : "/api/demo";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "text/event-stream, application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          prompt,
          messages: history,
          model: requestModel,
          locale: options.locale,
          reasonEnabled: options.reasonEnabled,
          effort: submitMeta.effort,
          tone: options.tone,
          attachments: modeAttachments(
            submitMeta.attachments,
            options.responseMode,
            options.locale,
          ),
          ...(endpoint === "/api/demo" && localArchive.length ? { localArchive } : {}),
        }),
      });
      armWatchdog(controller, conversation);

      if (!response.ok) {
        const payload = await response.json().catch(() => null) as {
          error?: unknown;
          requestId?: unknown;
          retryAfter?: unknown;
        } | null;
        const fallback = response.status === 401
          ? text.chat.authExpired
          : `${text.chat.apiError} ${response.status}`;
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
      const assistantContent = typeof payload?.answer === "string"
        ? payload.answer.trim()
        : "";
      if (!assistantContent) throw new Error("The AI response was empty.");
      const responseMeta = isResponseMeta(payload?.meta) ? payload.meta : undefined;
      if (responseMeta) applyMetaToContext(responseMeta);
      saveUpdatedMessages(conversation, (current) => current.map((message) => (
        message.id === assistantId
          ? {
              ...message,
              content: assistantContent,
              requestId: responseMeta?.requestId ?? requestId,
              ...(responseMeta ? { meta: responseMeta } : {}),
            }
          : message
      )));
      dispatch({ type: "completed" });
    } catch (error) {
      if (isAbortError(error)) return;
      saveUpdatedMessages(conversation, (current) => current.map((message) => (
        message.id === assistantId
          ? {
              ...message,
              content: message.content
                ? `${message.content}\n\n${text.chat.networkError}`
                : text.chat.networkError,
              error: !message.content,
              requestId,
            }
          : message
      )));
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
    let history = assistantIndex >= 0
      ? current.slice(0, assistantIndex)
      : current.filter((entry) => entry.id !== message.id);
    const latest = history[history.length - 1];
    if (latest?.role === "user" && latest.content.trim() === message.retryPrompt.trim()) {
      history = history.slice(0, -1);
    }
    setMessages((entries) => entries.filter((entry) => entry.id !== message.id));
    void runRequest(
      message.retryPrompt,
      { model: message.retryModel, effort: "medium", attachments: [] },
      { historyOverride: history },
    );
  }

  function regenerateMessage(message: ChatMessage) {
    if (isPending || message.role !== "assistant" || !message.content.trim()) return;
    const current = messagesRef.current;
    const assistantIndex = current.findIndex((entry) => entry.id === message.id);
    if (assistantIndex < 0) return;
    let userIndex = assistantIndex - 1;
    while (userIndex >= 0 && current[userIndex].role !== "user") userIndex -= 1;
    if (userIndex < 0) return;
    const prompt = current[userIndex].content;
    const versions = [...(message.versions ?? []), responseSnapshot(message)].slice(-5);
    void runRequest(
      prompt,
      {
        model: message.retryModel ?? options.currentModel,
        effort: "medium",
        attachments: [],
      },
      {
        historyOverride: current.slice(0, userIndex),
        reuseAssistantId: message.id,
        previousVersions: versions,
      },
    );
  }

  function restorePreviousVersion(messageId: string) {
    if (isPending) return;
    setMessages((current) => {
      const next = current.map((message) => {
        if (message.id !== messageId || !message.versions?.length) return message;
        const previous = message.versions[message.versions.length - 1];
        return {
          ...message,
          content: previous.content,
          requestId: previous.requestId,
          meta: previous.meta,
          versions: message.versions.slice(0, -1),
          comparison: undefined,
          stopped: false,
        };
      });
      saveCurrentMessages(next);
      return next;
    });
  }

  async function compareMessage(messageId: string, model: string) {
    if (isPending || !model) return;
    const current = messagesRef.current;
    const assistantIndex = current.findIndex((message) => message.id === messageId);
    if (assistantIndex < 0) return;
    let userIndex = assistantIndex - 1;
    while (userIndex >= 0 && current[userIndex].role !== "user") userIndex -= 1;
    if (userIndex < 0) return;
    const prompt = current[userIndex].content;
    const requestId = crypto.randomUUID();
    const requestModel = modelForPrompt(model, prompt, options.reasonEnabled, "medium");
    const localArchive = shouldIncludeLocalArchive(prompt) ? buildLocalArchiveSearchIndex() : [];

    setMessages((entries) => entries.map((message) => (
      message.id === messageId
        ? { ...message, comparison: { model, content: "", requestId, pending: true } }
        : message
    )));

    try {
      const endpoint = requestModel.startsWith("clodex:") ? "/api/clodex" : "/api/demo";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          prompt,
          messages: toContextMessages(current.slice(0, userIndex)),
          model: requestModel,
          locale: options.locale,
          reasonEnabled: options.reasonEnabled,
          effort: "medium",
          tone: options.tone,
          attachments: modeAttachments([], options.responseMode, options.locale),
          ...(endpoint === "/api/demo" && localArchive.length ? { localArchive } : {}),
        }),
      });
      const payload = await response.json().catch(() => null) as {
        answer?: unknown;
        error?: unknown;
        meta?: unknown;
        requestId?: unknown;
      } | null;
      const content = typeof payload?.answer === "string"
        ? payload.answer.trim()
        : typeof payload?.error === "string"
          ? payload.error
          : text.chat.networkError;
      const meta = isResponseMeta(payload?.meta) ? payload.meta : undefined;
      setMessages((entries) => {
        const next = entries.map((message) => (
          message.id === messageId
            ? {
                ...message,
                comparison: {
                  model,
                  content,
                  requestId: meta?.requestId
                    ?? (typeof payload?.requestId === "string" ? payload.requestId : requestId),
                  ...(meta ? { meta } : {}),
                  ...(!response.ok ? { error: true } : {}),
                },
              }
            : message
        ));
        saveCurrentMessages(next);
        return next;
      });
    } catch {
      setMessages((entries) => {
        const next = entries.map((message) => (
          message.id === messageId
            ? {
                ...message,
                comparison: {
                  model,
                  content: text.chat.networkError,
                  requestId,
                  error: true,
                },
              }
            : message
        ));
        saveCurrentMessages(next);
        return next;
      });
    }
  }

  function messagesThrough(messageId: string) {
    const current = messagesRef.current;
    const index = current.findIndex((message) => message.id === messageId);
    return index < 0 ? [] : current.slice(0, index + 1);
  }

  function toggleMessageContext(messageId: string) {
    if (isPending) return;
    setServerContextStats(null);
    setMessages((current) => {
      const next = current.map((message) => (
        message.id === messageId
          ? { ...message, excludedFromContext: !message.excludedFromContext }
          : message
      ));
      saveCurrentMessages(next);
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
      activeRequestRef.current = null;
      activeConversationRef.current = null;
      if (watchdogRef.current) clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
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
    regenerateMessage,
    restorePreviousVersion,
    compareMessage,
    messagesThrough,
    toggleMessageContext,
    clearMessages,
  };
}
