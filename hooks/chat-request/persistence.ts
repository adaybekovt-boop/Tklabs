import { DEFAULT_CONTEXT_LIMIT_TOKENS, estimateMessagesTokens, type ChatContextMessage } from "@/lib/ai/context";
import type { ChatResponseMode } from "@/lib/chat-modes";
import type { Locale } from "@/lib/i18n";
import type { ArchivedMessageVersion } from "@/lib/local-archive";
import { AUTO_ERMA_MODEL_KEY } from "@/lib/models/public";
import type { ChatMessage } from "@/components/playground/MessageList";
import type { ChatInputSubmitMeta } from "@/components/ui/ai-chat-input";

import type { ChatContextStats } from "./contracts";

export function toContextMessages(messages: ChatMessage[]): ChatContextMessage[] {
  return messages.flatMap((message) => {
    if (message.error || message.excludedFromContext || !message.content.trim()) return [];
    return [{ role: message.role, content: message.content.trim() }];
  });
}

export function contextStatsFromMessages(messages: ChatMessage[]): ChatContextStats {
  const contextMessages = toContextMessages(messages);
  return {
    estimatedTokens: estimateMessagesTokens(contextMessages),
    messages: contextMessages.length,
    attachments: 0,
    limit: DEFAULT_CONTEXT_LIMIT_TOKENS,
    compacted: false,
  };
}

/**
 * v0.22: response style is routed by Erma on the server. Legacy mode values are
 * deliberately ignored so a hidden value from an older client cannot steer the
 * current answer. Attachments remain plain untrusted document context.
 */
export function modeAttachments(
  attachments: ChatInputSubmitMeta["attachments"],
  _mode: ChatResponseMode,
  _locale: Locale,
) {
  return attachments;
}

export function responseSnapshot(message: ChatMessage): ArchivedMessageVersion {
  return {
    content: message.content,
    createdAt: Date.now(),
    ...(message.requestId ? { requestId: message.requestId } : {}),
    ...(message.meta ? { meta: message.meta } : {}),
  };
}

/**
 * Erma model selection is a server responsibility. Clodex remains an explicit
 * privileged route, while every Erma request is normalized back to erma-auto.
 */
export function modelForPrompt(
  model: string,
  _prompt: string,
  _reasoning: boolean,
  _effort: ChatInputSubmitMeta["effort"],
) {
  return model.startsWith("clodex:") ? model : AUTO_ERMA_MODEL_KEY;
}
