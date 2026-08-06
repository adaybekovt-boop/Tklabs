"use client";

import type { AiResponseMeta } from "@/lib/ai/types";

// Everything here is stored only in this browser's localStorage. Nothing is
// sent to or read from a TK LAB server — see the privacy notes on /truth.

export type ArchivedMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  excludedFromContext?: boolean;
  meta?: AiResponseMeta;
};

export type ArchivedSession = {
  id: string;
  title: string;
  model: string;
  createdAt?: number;
  updatedAt: number;
  pinned?: boolean;
  customTitle?: boolean;
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
let archiveCache: ArchivedSession[] | null = null;
let pendingArchivePayload: string | null = null;
let archiveWriteTimer: ReturnType<typeof setTimeout> | null = null;

function isBrowser() {
  return typeof window !== "undefined";
}

function optionalNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.round(value)) : undefined;
}

function sortSessions(sessions: ArchivedSession[]) {
  return [...sessions].sort((left, right) => {
    const pinnedDifference = Number(right.pinned === true) - Number(left.pinned === true);
    if (pinnedDifference !== 0) return pinnedDifference;
    return right.updatedAt - left.updatedAt;
  });
}

function sanitizeMeta(value: unknown): AiResponseMeta | undefined {
  if (!value || typeof value !== "object") return undefined;
  const meta = value as Partial<AiResponseMeta>;
  if (
    typeof meta.requestId !== "string"
    || typeof meta.requestedModel !== "string"
    || (meta.actualProvider !== "nvidia" && meta.actualProvider !== "clodex" && meta.actualProvider !== "edge-fallback")
    || typeof meta.actualModel !== "string"
  ) return undefined;
  const inputTokens = optionalNumber(meta.inputTokens);
  const outputTokens = optionalNumber(meta.outputTokens);
  const timeToFirstTokenMs = optionalNumber(meta.timeToFirstTokenMs);
  const contextMessageCount = optionalNumber(meta.contextMessageCount);
  const contextAttachmentCount = optionalNumber(meta.contextAttachmentCount);
  const contextLimit = optionalNumber(meta.contextLimit);
  return {
    requestId: meta.requestId.slice(0, 120),
    requestedModel: meta.requestedModel.slice(0, 120),
    actualProvider: meta.actualProvider,
    actualModel: meta.actualModel.slice(0, 160),
    latencyMs: optionalNumber(meta.latencyMs) ?? 0,
    httpStatus: typeof meta.httpStatus === "number" ? Math.round(meta.httpStatus) : 200,
    ...(meta.reasoningUsed === true ? { reasoningUsed: true } : {}),
    ...(typeof meta.fallbackReason === "string" ? { fallbackReason: meta.fallbackReason.slice(0, 120) } : {}),
    ...(inputTokens !== undefined ? { inputTokens } : {}),
    ...(outputTokens !== undefined ? { outputTokens } : {}),
    ...(timeToFirstTokenMs !== undefined ? { timeToFirstTokenMs } : {}),
    ...(contextMessageCount !== undefined ? { contextMessageCount } : {}),
    ...(contextAttachmentCount !== undefined ? { contextAttachmentCount } : {}),
    ...(contextLimit !== undefined ? { contextLimit } : {}),
    ...(meta.contextCompacted === true ? { contextCompacted: true } : {}),
  };
}

export function loadArchive(): ArchivedSession[] {
  if (!isBrowser()) return [];
  if (archiveCache) return archiveCache;
  try {
    const raw = window.localStorage.getItem(ARCHIVE_KEY);
    if (!raw) {
      archiveCache = [];
      return archiveCache;
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      archiveCache = [];
      return archiveCache;
    }
    let removedLegacyReasoning = false;
    const sessions = parsed.flatMap((value) => {
      if (!value || typeof value !== "object") return [];
      const session = value as Partial<ArchivedSession>;
      if (typeof session.id !== "string" || !Array.isArray(session.messages)) return [];
      const messages = session.messages.flatMap((value) => {
        if (!value || typeof value !== "object") return [];
        const message = value as Partial<ArchivedMessage> & Record<string, unknown>;
        if ((message.role !== "user" && message.role !== "assistant") || typeof message.content !== "string") return [];
        if (Object.prototype.hasOwnProperty.call(message, "thinking")) removedLegacyReasoning = true;
        const meta = sanitizeMeta(message.meta);
        return [{
          id: typeof message.id === "string" ? message.id : `${session.id}-${Math.random().toString(36).slice(2, 8)}`,
          role: message.role,
          content: message.content.slice(0, MAX_MESSAGE_CONTENT_LENGTH),
          ...(message.excludedFromContext === true ? { excludedFromContext: true } : {}),
          ...(meta ? { meta } : {}),
        }];
      }).slice(-MAX_MESSAGES_PER_SESSION);
      const updatedAt = typeof session.updatedAt === "number" && Number.isFinite(session.updatedAt) ? session.updatedAt : 0;
      const createdAt = typeof session.createdAt === "number" && Number.isFinite(session.createdAt)
        ? session.createdAt
        : updatedAt;
      return [{
        id: session.id.slice(0, 120),
        title: typeof session.title === "string" ? session.title.slice(0, 120) : "Untitled conversation",
        model: typeof session.model === "string" ? session.model.slice(0, 120) : "",
        createdAt,
        updatedAt,
        ...(session.pinned === true ? { pinned: true } : {}),
        ...(session.customTitle === true ? { customTitle: true } : {}),
        messages,
      }];
    }).slice(0, MAX_SESSIONS);
    const sortedSessions = sortSessions(sessions);
    if (removedLegacyReasoning) {
      try {
        window.localStorage.setItem(ARCHIVE_KEY, JSON.stringify(sortedSessions));
      } catch {
        // A storage failure must not make the current session unusable.
      }
    }
    archiveCache = sortedSessions;
    return sortedSessions;
  } catch {
    archiveCache = [];
    return archiveCache;
  }
}

function flushArchive() {
  if (!isBrowser() || !pendingArchivePayload) return;
  try {
    window.localStorage.setItem(ARCHIVE_KEY, pendingArchivePayload);
    pendingArchivePayload = null;
  } catch {
    // A storage failure must not make the current session unusable.
  }
}

function scheduleArchiveWrite(sessions: ArchivedSession[]) {
  if (!isBrowser()) return;
  pendingArchivePayload = JSON.stringify(sessions);
  if (archiveWriteTimer) clearTimeout(archiveWriteTimer);
  archiveWriteTimer = setTimeout(() => {
    archiveWriteTimer = null;
    flushArchive();
  }, 350);
}

function persistArchive(sessions: ArchivedSession[]) {
  if (!isBrowser()) return;
  const next = sortSessions(sessions).slice(0, MAX_SESSIONS);
  while (next.length > 1 && JSON.stringify(next).length > MAX_ARCHIVE_JSON_LENGTH) next.pop();
  archiveCache = next;
  scheduleArchiveWrite(next);
  window.dispatchEvent(new Event("tklab:archive-updated"));
}

function updateSession(id: string, update: (session: ArchivedSession) => ArchivedSession) {
  if (!isBrowser()) return false;
  const sessions = loadArchive();
  const index = sessions.findIndex((session) => session.id === id);
  if (index < 0) return false;
  const next = [...sessions];
  next[index] = update(next[index]);
  persistArchive(next);
  return true;
}

export function getSession(id: string): ArchivedSession | undefined {
  return loadArchive().find((session) => session.id === id);
}

export function saveSession(session: ArchivedSession) {
  if (!isBrowser() || session.messages.length === 0) return;
  const existing = getSession(session.id);
  const now = Date.now();
  const generatedTitle = session.title.trim().slice(0, 120) || "Untitled conversation";
  const safeSession: ArchivedSession = {
    id: session.id.slice(0, 120),
    title: existing?.customTitle ? existing.title : generatedTitle,
    model: session.model.slice(0, 120),
    createdAt: existing?.createdAt ?? session.createdAt ?? now,
    updatedAt: Number.isFinite(session.updatedAt) ? session.updatedAt : now,
    ...(existing?.pinned === true || session.pinned === true ? { pinned: true } : {}),
    ...(existing?.customTitle === true || session.customTitle === true ? { customTitle: true } : {}),
    messages: session.messages.slice(-MAX_MESSAGES_PER_SESSION).map((message) => {
      const meta = sanitizeMeta(message.meta);
      return {
        id: message.id.slice(0, 120),
        role: message.role,
        content: message.content.slice(0, MAX_MESSAGE_CONTENT_LENGTH),
        ...(message.excludedFromContext === true ? { excludedFromContext: true } : {}),
        ...(meta ? { meta } : {}),
      };
    }),
  };
  try {
    persistArchive([safeSession, ...loadArchive().filter((entry) => entry.id !== safeSession.id)]);
  } catch {
    // Storage can be unavailable or full. Chat generation must remain usable.
  }
}

export function renameSession(id: string, title: string) {
  const normalizedTitle = title.trim().replace(/\s+/g, " ").slice(0, 120);
  if (!normalizedTitle) return false;
  return updateSession(id, (session) => ({
    ...session,
    title: normalizedTitle,
    customTitle: true,
    updatedAt: Date.now(),
  }));
}

export function toggleSessionPinned(id: string) {
  return updateSession(id, (session) => ({
    ...session,
    pinned: session.pinned !== true,
  }));
}

export function deleteSession(id: string) {
  if (!isBrowser()) return;
  try {
    persistArchive(loadArchive().filter((entry) => entry.id !== id));
  } catch {
    // Ignore storage errors in private browsing or restricted environments.
  }
}

export function clearArchive() {
  if (!isBrowser()) return;
  try {
    archiveCache = [];
    pendingArchivePayload = null;
    if (archiveWriteTimer) clearTimeout(archiveWriteTimer);
    archiveWriteTimer = null;
    window.localStorage.removeItem(ARCHIVE_KEY);
    window.dispatchEvent(new Event("tklab:archive-updated"));
  } catch {
    // Ignore storage errors in private browsing or restricted environments.
  }
}

if (typeof window !== "undefined") window.addEventListener("pagehide", flushArchive);

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
