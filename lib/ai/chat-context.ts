export type ChatContextRole = "user" | "assistant";

export type ChatContextMessage = {
  role: ChatContextRole;
  content: string;
};

export type ProviderChatMessage = ChatContextMessage;

export const PUBLIC_CONTEXT_CHARACTER_LIMIT = 24_000;
export const PRIVILEGED_CONTEXT_CHARACTER_LIMIT = 96_000;
export const MAX_CONTEXT_MESSAGES = 24;
export const MAX_CONTEXT_MESSAGE_CHARACTERS = 16_000;

function characterLength(value: string) {
  return Array.from(value).length;
}

function normalizeMessage(value: unknown): ChatContextMessage | null {
  if (!value || typeof value !== "object") return null;
  const item = value as { role?: unknown; content?: unknown; error?: unknown };
  if (item.role !== "user" && item.role !== "assistant") return null;
  if (typeof item.content !== "string" || item.error === true) return null;
  const content = item.content.trim();
  if (!content || characterLength(content) > MAX_CONTEXT_MESSAGE_CHARACTERS) return null;
  return { role: item.role, content };
}

export function buildChatContext(history: unknown, options: { privileged?: boolean } = {}) {
  const source = Array.isArray(history) ? history : [];
  const normalized = source.map(normalizeMessage).filter((message): message is ChatContextMessage => Boolean(message));
  const messageLimit = MAX_CONTEXT_MESSAGES;
  const characterLimit = options.privileged === true
    ? PRIVILEGED_CONTEXT_CHARACTER_LIMIT
    : PUBLIC_CONTEXT_CHARACTER_LIMIT;

  const selected: ChatContextMessage[] = [];
  let characters = 0;
  for (let index = normalized.length - 1; index >= 0 && selected.length < messageLimit; index -= 1) {
    const message = normalized[index];
    const length = characterLength(message.content);
    if (characters + length > characterLimit) break;
    selected.unshift(message);
    characters += length;
  }

  // Context must begin with a user turn. Leading assistant messages have no
  // reliable instruction boundary and are removed instead of being guessed.
  while (selected[0]?.role === "assistant") selected.shift();

  return {
    messages: selected,
    characters: selected.reduce((total, message) => total + characterLength(message.content), 0),
    truncated: selected.length < normalized.length,
  };
}

export function providerMessages(system: string, history: ProviderChatMessage[], prompt: string) {
  return [
    { role: "system" as const, content: system },
    ...history.map((message) => ({ role: message.role, content: message.content })),
    { role: "user" as const, content: prompt },
  ];
}
