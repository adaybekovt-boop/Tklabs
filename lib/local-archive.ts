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

function isBrowser() {
  return typeof window !== "undefined";
}

export function loadArchive(): ArchivedSession[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(ARCHIVE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ArchivedSession[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getSession(id: string): ArchivedSession | undefined {
  return loadArchive().find((session) => session.id === id);
}

export function saveSession(session: ArchivedSession) {
  if (!isBrowser() || session.messages.length === 0) return;
  const sessions = loadArchive().filter((entry) => entry.id !== session.id);
  sessions.unshift(session);
  window.localStorage.setItem(ARCHIVE_KEY, JSON.stringify(sessions.slice(0, MAX_SESSIONS)));
}

export function deleteSession(id: string) {
  if (!isBrowser()) return;
  window.localStorage.setItem(ARCHIVE_KEY, JSON.stringify(loadArchive().filter((entry) => entry.id !== id)));
}

export function clearArchive() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(ARCHIVE_KEY);
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
  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
