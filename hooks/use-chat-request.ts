import { useEffect, useRef, useState } from "react";

import type { AiResponseMeta } from "@/lib/ai/types";
import type { Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/i18n";
import type { ArchivedMessage } from "@/lib/local-archive";
import type { ChatInputSubmitMeta } from "@/components/ui/ai-chat-input";
import type { ChatMessage } from "@/components/playground/MessageList";

type Tone = "professional" | "character";

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

export function useChatRequest(options: {
  locale: Locale;
  tone: Tone;
  reasonEnabled: boolean;
  promptLimit: number;
  saveConversation: (prompt: string, model: string, messages: ArchivedMessage[]) => void;
}) {
  const text = getDictionary(options.locale);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isPending, setIsPending] = useState(false);
  const activeRequestRef = useRef<AbortController | null>(null);
  const activeConversationRef = useRef<{ prompt: string; model: string; assistantId: string } | null>(null);

  function appendAssistant(assistantId: string, update: (message: ChatMessage) => ChatMessage) {
    setMessages((current) => current.map((message) => (message.id === assistantId ? update(message) : message)));
  }

  function stopGeneration() {
    const activeConversation = activeConversationRef.current;
    activeRequestRef.current?.abort();
    activeRequestRef.current = null;
    activeConversationRef.current = null;
    setMessages((current) => {
      const next = [...current];
      const targetIndex = activeConversation ? next.findIndex((message) => message.id === activeConversation.assistantId) : next.length - 1;
      const last = targetIndex >= 0 ? next[targetIndex] : undefined;
      if (last?.role === "assistant" && !last.content.endsWith("\n\n" + text.chat.generationStopped)) {
        next[targetIndex] = { ...last, content: last.content ? last.content + "\n\n" + text.chat.generationStopped : text.chat.generationStopped };
      }
      if (activeConversation) options.saveConversation(activeConversation.prompt, activeConversation.model, next as ArchivedMessage[]);
      return next;
    });
    setIsPending(false);
  }

  async function handleSubmit(prompt: string, submitMeta: ChatInputSubmitMeta) {
    if (!prompt || prompt.length > options.promptLimit || isPending) return;

    const nextModelKey = submitMeta.model;
    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: "user", content: prompt };
    const assistantId = crypto.randomUUID();
    const controller = new AbortController();
    setMessages((current) => [...current, userMessage, { id: assistantId, role: "assistant", content: "" }]);
    setIsPending(true);
    activeRequestRef.current = controller;
    activeConversationRef.current = { prompt, model: nextModelKey, assistantId };

    try {
      const endpoint = nextModelKey.startsWith("clodex:") ? "/api/clodex" : "/api/demo";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          prompt,
          model: nextModelKey,
          locale: options.locale,
          reason: options.reasonEnabled || submitMeta.effort !== "low",
          effort: submitMeta.effort,
          tone: options.tone,
          attachments: submitMeta.attachments,
        }),
      });

      if (!response.ok || !response.body) {
        const payload = await response.json().catch(() => null);
        const fallback = response.status === 401 ? text.chat.authExpired : text.chat.apiError + " " + response.status;
        const errorText = (payload as { error?: string } | null)?.error ?? fallback;
        appendAssistant(assistantId, (message) => ({ ...message, content: errorText, error: true }));
        return;
      }

      const payload = await response.json().catch(() => null) as { answer?: unknown; meta?: unknown } | null;
      const assistantContent = typeof payload?.answer === "string" ? payload.answer.trim() : "";
      if (!assistantContent) throw new Error("The AI response was empty.");
      const responseMeta = isResponseMeta(payload?.meta) ? payload.meta : undefined;

      setMessages((current) => {
        const next = current.map((message) => message.id === assistantId
          ? { ...message, content: assistantContent, ...(responseMeta ? { meta: responseMeta } : {}) }
          : message,
        );
        options.saveConversation(prompt, nextModelKey, next as ArchivedMessage[]);
        return next;
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      appendAssistant(assistantId, (message) => ({ ...message, content: text.chat.networkError, error: true }));
    } finally {
      if (activeRequestRef.current === controller) {
        activeRequestRef.current = null;
        activeConversationRef.current = null;
      }
      setIsPending(false);
    }
  }

  function clearMessages() {
    setMessages([]);
  }

  useEffect(() => () => {
    activeRequestRef.current?.abort();
  }, []);

  return { messages, setMessages, isPending, handleSubmit, stopGeneration, clearMessages };
}
