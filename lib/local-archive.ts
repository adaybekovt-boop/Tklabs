"use client";

// Everything here is stored only in this browser's localStorage. Nothing is
// sent to or read from a TK LAB server — see the privacy notes on /truth.

export type ArchivedMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  meta?: {
    model: string;
    provider: string;
    providerModel?: string;
    latencyMs: number;
  };
};

export type ArchivedSession = {
  id: string;
  title: string;
  model: string;
  updatedAt: number;
  messages: ArchivedMessage[];
};

export type LocalSettings = {
  defaultModel?: string;
};

const ARCHIVE_KEY = "tklab.archive.v1";
const SETTINGS_KEY = "tklab.settings.v1";
const MAX_SESSIONS = 30;
const MAX_MESSAGES_PER_SESSION = 80;
const MAX_MESSAGE_CONTENT_LENGTH = 12_000;
const MAX_ARCHIVE_JSON_LENGTH = 1_500_000;

function isBrowser() {
  return typeof window !== "undefined";
}

export function loadArchive(): ArchivedSession[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(ARCHIVE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((value) => {
      if (!value || typeof value !== "object") return [];
      const session = value as Partial<ArchivedSession>;
      if (typeof session.id !== "string" || !Array.isArray(session.messages)) return [];
      const messages = session.messages.flatMap((value) => {
        if (!value || typeof value !== "object") return [];
        const message = value as Partial<ArchivedMessage>;
        if ((message.role !== "user" && message.role !== "assistant") || typeof message.content !== "string") return [];
        return [{
          id: typeof message.id === "string" ? message.id : `${session.id}-${Math.random().toString(36).slice(2, 8)}`,
          role: message.role,
          content: message.content.slice(0, MAX_MESSAGE_CONTENT_LENGTH),
          ...(message.meta && typeof message.meta === "object" && typeof message.meta.model === "string" && typeof message.meta.provider === "string"
            ? { meta: { model: message.meta.model.slice(0, 120), provider: message.meta.provider.slice(0, 80), ...(typeof message.meta.providerModel === "string" ? { providerModel: message.meta.providerModel.slice(0, 160) } : {}), latencyMs: typeof message.meta.latencyMs === "number" ? message.meta.latencyMs : 0 } }
            : {}),
        }];
      }).slice(-MAX_MESSAGES_PER_SESSION);
      return [{
        id: session.id,
        title: typeof session.title === "string" ? session.title.slice(0, 120) : "Untitled conversation",
        model: typeof session.model === "string" ? session.model.slice(0, 120) : "",
        updatedAt: typeof session.updatedAt === "number" ? session.updatedAt : 0,
        messages,
      }];
    }).slice(0, MAX_SESSIONS);
  } catch {
    return [];
  }
}

export function getSession(id: string): ArchivedSession | undefined {
  return loadArchive().find((session) => session.id === id);
}

export function saveSession(session: ArchivedSession) {
  if (!isBrowser() || session.messages.length === 0) return;
  const safeSession: ArchivedSession = {
    id: session.id.slice(0, 120),
    title: session.title.slice(0, 120),
    model: session.model.slice(0, 120),
    updatedAt: Number.isFinite(session.updatedAt) ? session.updatedAt : Date.now(),
    messages: session.messages.slice(-MAX_MESSAGES_PER_SESSION).map((message) => ({
      id: message.id.slice(0, 120),
      role: message.role,
      content: message.content.slice(0, MAX_MESSAGE_CONTENT_LENGTH),
      ...(message.meta ? { meta: { ...message.meta, model: message.meta.model.slice(0, 120), provider: message.meta.provider.slice(0, 80), providerModel: message.meta.providerModel?.slice(0, 160) } } : {}),
    })),
  };
  const sessions = [safeSession, ...loadArchive().filter((entry) => entry.id !== safeSession.id)].slice(0, MAX_SESSIONS);
  try {
    while (sessions.length > 1 && JSON.stringify(sessions).length > MAX_ARCHIVE_JSON_LENGTH) sessions.pop();
    window.localStorage.setItem(ARCHIVE_KEY, JSON.stringify(sessions));
    window.dispatchEvent(new Event("tklab:archive-updated"));
  } catch {
    // Storage can be unavailable or full. Chat generation must remain usable.
  }
}

export function deleteSession(id: string) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(ARCHIVE_KEY, JSON.stringify(loadArchive().filter((entry) => entry.id !== id)));
    window.dispatchEvent(new Event("tklab:archive-updated"));
  } catch {
    // Ignore storage errors in private browsing or restricted environments.
  }
}

export function clearArchive() {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(ARCHIVE_KEY);
    window.dispatchEvent(new Event("tklab:archive-updated"));
  } catch {
    // Ignore storage errors in private browsing or restricted environments.
  }
}

export function loadSettings(): LocalSettings {
  if (!isBrowser()) return {};
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    return raw ? (JSON.parse(raw) as LocalSettings) : {};
  } catch {
    return {};
  }
}

export function saveSettings(settings: LocalSettings) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Settings are optional and must never block the chat.
  }
}
