export type ChatContextRole = "user" | "assistant";

export type ChatContextMessage = {
  role: ChatContextRole;
  content: string;
};

export type PreparedChatContext = {
  messages: ChatContextMessage[];
  summary?: string;
  estimatedTokens: number;
  originalMessageCount: number;
  includedMessageCount: number;
  attachmentCount: number;
  contextLimit: number;
  compacted: boolean;
};

export const DEFAULT_CONTEXT_LIMIT_TOKENS = 64_000;
export const DEFAULT_OUTPUT_RESERVE_TOKENS = 8_192;
export const MAX_CONTEXT_MESSAGES = 80;
export const MAX_CONTEXT_MESSAGE_CHARACTERS = 12_000;
const RECENT_MESSAGES_TO_KEEP = 12;
const MAX_SUMMARY_CHARACTERS = 8_000;

export class ChatContextValidationError extends Error {
  readonly status: 400 | 413;

  constructor(message: string, status: 400 | 413 = 400) {
    super(message);
    this.name = "ChatContextValidationError";
    this.status = status;
  }
}

function characterLength(value: string) {
  return Array.from(value).length;
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

/**
 * Provider-neutral token estimate. It deliberately overestimates punctuation
 * and non-Latin text so context compaction happens before the provider rejects
 * a request. Exact usage returned by the provider replaces this estimate in
 * response metadata when available.
 */
export function estimateTextTokens(value: string) {
  if (!value) return 0;
  const parts = value.match(/[A-Za-z0-9_]+|[^\sA-Za-z0-9_]/gu) ?? [];
  let tokens = 0;
  for (const part of parts) {
    if (/^[A-Za-z0-9_]+$/.test(part)) tokens += Math.max(1, Math.ceil(part.length / 4));
    else if (/^\p{L}+$/u.test(part)) tokens += Math.max(1, Math.ceil(Array.from(part).length / 2));
    else tokens += Math.max(1, Array.from(part).length);
  }
  return tokens;
}

export function estimateMessagesTokens(messages: ChatContextMessage[], summary?: string) {
  const messageTokens = messages.reduce(
    (total, message) => total + 4 + estimateTextTokens(message.content),
    2,
  );
  return messageTokens + (summary ? 8 + estimateTextTokens(summary) : 0);
}

export function normalizeChatContextMessages(value: unknown): ChatContextMessage[] {
  if (value == null) return [];
  if (!Array.isArray(value)) throw new ChatContextValidationError("Conversation messages must be an array.");
  if (value.length > MAX_CONTEXT_MESSAGES * 2) {
    throw new ChatContextValidationError("Conversation contains too many messages.", 413);
  }

  const normalized: ChatContextMessage[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") {
      throw new ChatContextValidationError("Conversation contains an invalid message.");
    }
    const message = entry as { role?: unknown; content?: unknown };
    if ((message.role !== "user" && message.role !== "assistant") || typeof message.content !== "string") {
      throw new ChatContextValidationError("Conversation contains an invalid message.");
    }
    const content = message.content.trim();
    if (!content) continue;
    if (characterLength(content) > MAX_CONTEXT_MESSAGE_CHARACTERS) {
      throw new ChatContextValidationError("One conversation message is too large.", 413);
    }
    normalized.push({ role: message.role, content });
  }
  return normalized;
}

function summaryLine(message: ChatContextMessage) {
  const label = message.role === "user" ? "User" : "Assistant";
  const compact = normalizeWhitespace(message.content);
  const excerpt = Array.from(compact).slice(0, 700).join("");
  return `${label}: ${excerpt}${characterLength(compact) > 700 ? "…" : ""}`;
}

function buildSummary(messages: ChatContextMessage[]) {
  if (!messages.length) return "";
  const lines = messages.map(summaryLine);
  let summary = lines.join("\n");
  if (characterLength(summary) > MAX_SUMMARY_CHARACTERS) {
    summary = Array.from(summary).slice(-MAX_SUMMARY_CHARACTERS).join("");
  }
  return summary;
}

export function prepareChatContext(input: {
  history: unknown;
  currentUserContent: string;
  attachmentCount?: number;
  contextLimit?: number;
  outputReserve?: number;
}): PreparedChatContext {
  const normalizedHistory = normalizeChatContextMessages(input.history);
  const contextLimit = Math.max(8_192, Math.floor(input.contextLimit ?? DEFAULT_CONTEXT_LIMIT_TOKENS));
  const outputReserve = Math.min(
    Math.max(1_024, Math.floor(input.outputReserve ?? DEFAULT_OUTPUT_RESERVE_TOKENS)),
    Math.floor(contextLimit / 2),
  );
  const inputBudget = contextLimit - outputReserve;
  const currentUserContent = input.currentUserContent.trim();
  if (!currentUserContent) throw new ChatContextValidationError("The current user message is empty.");

  const originalMessageCount = normalizedHistory.length + 1;
  let compacted = normalizedHistory.length > MAX_CONTEXT_MESSAGES;
  let history = normalizedHistory.slice(-MAX_CONTEXT_MESSAGES);
  let messages = [...history, { role: "user" as const, content: currentUserContent }];
  let summary = "";
  let estimatedTokens = estimateMessagesTokens(messages);

  if (estimatedTokens > inputBudget) {
    compacted = true;
    const recent = history.slice(-RECENT_MESSAGES_TO_KEEP);
    const older = history.slice(0, Math.max(0, history.length - recent.length));
    summary = buildSummary(older);
    messages = [...recent, { role: "user", content: currentUserContent }];
    estimatedTokens = estimateMessagesTokens(messages, summary);

    while (estimatedTokens > inputBudget && summary) {
      const lines = summary.split("\n");
      if (lines.length <= 1) {
        summary = "";
      } else {
        lines.shift();
        summary = lines.join("\n");
      }
      estimatedTokens = estimateMessagesTokens(messages, summary);
    }

    while (estimatedTokens > inputBudget && messages.length > 2) {
      messages = messages.slice(1);
      estimatedTokens = estimateMessagesTokens(messages, summary);
    }
  }

  if (estimatedTokens > inputBudget) {
    throw new ChatContextValidationError("Conversation context exceeds the model limit.", 413);
  }

  return {
    messages,
    ...(summary ? { summary } : {}),
    estimatedTokens,
    originalMessageCount,
    includedMessageCount: messages.length,
    attachmentCount: Math.max(0, Math.floor(input.attachmentCount ?? 0)),
    contextLimit,
    compacted,
  };
}
