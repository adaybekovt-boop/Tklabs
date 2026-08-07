import { DEFAULT_CONTEXT_LIMIT_TOKENS, estimateMessagesTokens, type ChatContextMessage } from "@/lib/ai/context";
import { chatResponseModeInstruction, type ChatResponseMode } from "@/lib/chat-modes";
import type { Locale } from "@/lib/i18n";
import type { ArchivedMessageVersion } from "@/lib/local-archive";
import { AUTO_ERMA_MODEL_KEY, resolveAutoErmaModelKey } from "@/lib/models/public";
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

export function modeAttachments(
  attachments: ChatInputSubmitMeta["attachments"],
  mode: ChatResponseMode,
  locale: Locale,
) {
  const instruction = chatResponseModeInstruction(mode, locale);
  if (attachments.length === 0) return [{ name: ".tklabs-response-mode.txt", content: instruction }];
  return attachments.map((attachment, index) => index === 0
    ? { ...attachment, content: `${attachment.content}\n\n[TK LAB RESPONSE MODE]\n${instruction}` }
    : attachment);
}

export function responseSnapshot(message: ChatMessage): ArchivedMessageVersion {
  return {
    content: message.content,
    createdAt: Date.now(),
    ...(message.requestId ? { requestId: message.requestId } : {}),
    ...(message.meta ? { meta: message.meta } : {}),
  };
}

export function modelForPrompt(
  model: string,
  prompt: string,
  reasoning: boolean,
  effort: ChatInputSubmitMeta["effort"],
) {
  return model === AUTO_ERMA_MODEL_KEY
    ? resolveAutoErmaModelKey(prompt, { reasoning, effort })
    : model;
}
