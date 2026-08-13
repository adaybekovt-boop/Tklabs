const DRAFT_PREFIX = "tklabs.chat-draft.v1:";
const MAX_DRAFT_LENGTH = 20_000;

type DraftStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function browserStorage(): DraftStorage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function draftStorageKey(sessionId: string) {
  return `${DRAFT_PREFIX}${sessionId.slice(0, 120)}`;
}

export function readChatDraft(sessionId: string, storage: DraftStorage | null = browserStorage()) {
  if (!storage || !sessionId) return "";
  try {
    return (storage.getItem(draftStorageKey(sessionId)) ?? "").slice(0, MAX_DRAFT_LENGTH);
  } catch {
    return "";
  }
}

export function writeChatDraft(
  sessionId: string,
  value: string,
  storage: DraftStorage | null = browserStorage(),
) {
  if (!storage || !sessionId) return;
  try {
    if (value.trim()) storage.setItem(draftStorageKey(sessionId), value.slice(0, MAX_DRAFT_LENGTH));
    else storage.removeItem(draftStorageKey(sessionId));
  } catch {
    // Draft persistence is optional and must never block the chat.
  }
}

export function clearChatDraft(sessionId: string, storage: DraftStorage | null = browserStorage()) {
  if (!storage || !sessionId) return;
  try {
    storage.removeItem(draftStorageKey(sessionId));
  } catch {
    // Ignore restricted or full storage.
  }
}
