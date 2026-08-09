"use client";

import type { AiResponseMeta, AiToolCallTrace, AiToolName } from "@/lib/ai/types";

// Everything here is stored only in this browser's localStorage. Nothing is
// sent to or read from a TK LAB server — see the privacy notes on /truth.

export type ArchivedMessageVersion = {
  content: string;
  createdAt: number;
  requestId?: string;
  meta?: AiResponseMeta;
};

export type ArchivedMessageComparison = {
  model: string;
  content: string;
  requestId?: string;
  meta?: AiResponseMeta;
  error?: boolean;
  pending?: boolean;
};

export type ArchivedMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  excludedFromContext?: boolean;
  stopped?: boolean;
  versions?: ArchivedMessageVersion[];
  comparison?: ArchivedMessageComparison;
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
  project?: string;
  parentSessionId?: string;
  branchedFromMessageId?: string;
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
const MAX_MESSAGE_VERSIONS = 5;
const MAX_TOOL_CALLS_PER_MESSAGE = 4;
const MAX_GROUNDING_SUGGESTIONS_HTML = 60_000;
const AI_TOOL_NAMES = new Set<AiToolName>([
  "search_documentation",
  "search_patch_notes",
  "get_service_status",
  "calculate",
  "search_local_archive",
  "get_model_capabilities",
  "search_web",
]);
let archiveCache: ArchivedSession[] | null = null;
let pendingArchivePayload: string | null = null;
let archiveWriteTimer: ReturnType<typeof setTimeout> | null = null;

function isBrowser() {
  return typeof window !== "undefined";
}

function optionalNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.round(value)) : undefined;
}

function sanitizeToolCalls(value: unknown): AiToolCallTrace[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const traces = value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const trace = entry as Partial<AiToolCallTrace>;
    if (
      typeof trace.id !== "string"
      || typeof trace.name !== "string"
      || !AI_TOOL_NAMES.has(trace.name as AiToolName)
      || (trace.status !== "success" && trace.status !== "error" && trace.status !== "timeout" && trace.status !== "blocked")
      || typeof trace.summary !== "string"
    ) return [];
    const links = Array.isArray(trace.links)
      ? trace.links.flatMap((link) => {
          if (!link || typeof link !== "object") return [];
          const candidate = link as { label?: unknown; href?: unknown };
          if (
            typeof candidate.label !== "string"
            || typeof candidate.href !== "string"
            || !candidate.href.startsWith("/")
            || candidate.href.startsWith("//")
          ) return [];
          return [{ label: candidate.label.slice(0, 120), href: candidate.href.slice(0, 240) }];
        }).slice(0, 5)
      : [];
    return [{
      id: trace.id.slice(0, 120),
      name: trace.name as AiToolName,
      status: trace.status,
      durationMs: optionalNumber(trace.durationMs) ?? 0,
      summary: trace.summary.slice(0, 180),
      ...(links.length ? { links } : {}),
    }];
  }).slice(0, MAX_TOOL_CALLS_PER_MESSAGE);
  return traces.length ? traces : undefined;
}

function createSessionId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function sortSessions(sessions: ArchivedSession[]) {
  return [...sessions].sort((left, right) => {
    const pinnedDifference = Number(right.pinned === true) - Number(left.pinned === true);
    if (pinnedDifference !== 0) return pinnedDifference;
    return right.updatedAt - left.updatedAt;
  });
}

function sanitizeGrounding(value: unknown): AiResponseMeta["grounding"] {
  if (!value || typeof value !== "object") return undefined;
  const grounding = value as NonNullable<AiResponseMeta["grounding"]>;
  if (grounding.provider !== "google-search" || grounding.directPassThrough !== true) return undefined;

  const searchQueries = Array.isArray(grounding.searchQueries)
    ? grounding.searchQueries
        .filter((query): query is string => typeof query === "string" && Boolean(query.trim()))
        .slice(0, 8)
        .map((query) => query.trim().slice(0, 400))
    : [];

  const citations = Array.isArray(grounding.citations)
    ? grounding.citations.flatMap((citation) => {
        if (!citation || typeof citation !== "object") return [];
        const candidate = citation as { title?: unknown; url?: unknown; startIndex?: unknown; endIndex?: unknown };
        if (typeof candidate.title !== "string" || typeof candidate.url !== "string" || !candidate.title.trim()) return [];
        try {
          const url = new URL(candidate.url);
          if (url.protocol !== "https:" && url.protocol !== "http:") return [];
        } catch {
          return [];
        }
        const startIndex = optionalNumber(candidate.startIndex);
        const endIndex = optionalNumber(candidate.endIndex);
        return [{
          title: candidate.title.trim().slice(0, 220),
          url: candidate.url.slice(0, 2_000),
          ...(startIndex !== undefined ? { startIndex } : {}),
          ...(endIndex !== undefined ? { endIndex } : {}),
        }];
      }).slice(0, 16)
    : [];

  const searchSuggestionsHtml = typeof grounding.searchSuggestionsHtml === "string"
    && grounding.searchSuggestionsHtml.length <= MAX_GROUNDING_SUGGESTIONS_HTML
    ? grounding.searchSuggestionsHtml
    : undefined;

  return {
    provider: "google-search",
    directPassThrough: true,
    searchQueries,
    citations,
    ...(searchSuggestionsHtml ? { searchSuggestionsHtml } : {}),
  };
}

function sanitizeMeta(value: unknown): AiResponseMeta | undefined {
  if (!value || typeof value !== "object") return undefined;
  const meta = value as Partial<AiResponseMeta>;
  if (
    typeof meta.requestId !== "string"
    || typeof meta.requestedModel !== "string"
    || (meta.actualProvider !== "nvidia" && meta.actualProvider !== "google-grounding" && meta.actualProvider !== "clodex" && meta.actualProvider !== "edge-fallback")
    || typeof meta.actualModel !== "string"
  ) return undefined;
  const inputTokens = optionalNumber(meta.inputTokens);
  const outputTokens = optionalNumber(meta.outputTokens);
  const timeToFirstTokenMs = optionalNumber(meta.timeToFirstTokenMs);
  const contextMessageCount = optionalNumber(meta.contextMessageCount);
  const contextAttachmentCount = optionalNumber(meta.contextAttachmentCount);
  const contextLimit = optionalNumber(meta.contextLimit);
  const toolCalls = sanitizeToolCalls(meta.toolCalls);
  const grounding = sanitizeGrounding(meta.grounding);
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
    ...(toolCalls ? { toolCalls } : {}),
    ...(grounding ? { grounding } : {}),
  };
}

function sanitizeVersions(value: unknown): ArchivedMessageVersion[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const versions = value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const version = entry as Partial<ArchivedMessageVersion>;
    if (typeof version.content !== "string" || !version.content.trim()) return [];
    const meta = sanitizeMeta(version.meta);
    return [{
      content: version.content.slice(0, MAX_MESSAGE_CONTENT_LENGTH),
      createdAt: typeof version.createdAt === "number" && Number.isFinite(version.createdAt) ? version.createdAt : 0,
      ...(typeof version.requestId === "string" ? { requestId: version.requestId.slice(0, 120) } : {}),
      ...(meta ? { meta } : {}),
    }];
  }).slice(-MAX_MESSAGE_VERSIONS);
  return versions.length ? versions : undefined;
}

function sanitizeComparison(value: unknown): ArchivedMessageComparison | undefined {
  if (!value || typeof value !== "object") return undefined;
  const comparison = value as Partial<ArchivedMessageComparison>;
  if (typeof comparison.model !== "string" || typeof comparison.content !== "string") return undefined;
  const meta = sanitizeMeta(comparison.meta);
  return {
    model: comparison.model.slice(0, 120),
    content: comparison.content.slice(0, MAX_MESSAGE_CONTENT_LENGTH),
    ...(typeof comparison.requestId === "string" ? { requestId: comparison.requestId.slice(0, 120) } : {}),
    ...(comparison.error === true ? { error: true } : {}),
    ...(meta ? { meta } : {}),
  };
}

function sanitizeMessage(value: unknown, sessionId: string): ArchivedMessage | null {
  if (!value || typeof value !== "object") return null;
  const message = value as Partial<ArchivedMessage> & Record<string, unknown>;
  if ((message.role !== "user" && message.role !== "assistant") || typeof message.content !== "string") return null;
  const meta = sanitizeMeta(message.meta);
  const versions = sanitizeVersions(message.versions);
  const comparison = sanitizeComparison(message.comparison);
  return {
    id: typeof message.id === "string" ? message.id.slice(0, 120) : `${sessionId}-${Math.random().toString(36).slice(2, 8)}`,
    role: message.role,
    content: message.content.slice(0, MAX_MESSAGE_CONTENT_LENGTH),
    ...(message.excludedFromContext === true ? { excludedFromContext: true } : {}),
    ...(message.stopped === true ? { stopped: true } : {}),
    ...(versions ? { versions } : {}),
    ...(comparison ? { comparison } : {}),
    ...(meta ? { meta } : {}),
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
      const normalizedSessionId = session.id.slice(0, 120);
      const messages = session.messages.flatMap((value) => {
        if (value && typeof value === "object" && Object.prototype.hasOwnProperty.call(value, "thinking")) removedLegacyReasoning = true;
        const sanitized = sanitizeMessage(value, normalizedSessionId);
        return sanitized ? [sanitized] : [];
      }).slice(-MAX_MESSAGES_PER_SESSION);
      const updatedAt = typeof session.updatedAt === "number" && Number.isFinite(session.updatedAt) ? session.updatedAt : 0;
      const createdAt = typeof session.createdAt === "number" && Number.isFinite(session.createdAt) ? session.createdAt : updatedAt;
      return [{
        id: normalizedSessionId,
        title: typeof session.title === "string" ? session.title.slice(0, 120) : "Untitled conversation",
        model: typeof session.model === "string" ? session.model.slice(0, 120) : "",
        createdAt,
        updatedAt,
        ...(session.pinned === true ? { pinned: true } : {}),
        ...(session.customTitle === true ? { customTitle: true } : {}),
        ...(typeof session.project === "string" && session.project.trim() ? { project: session.project.trim().slice(0, 80) } : {}),
        ...(typeof session.parentSessionId === "string" ? { parentSessionId: session.parentSessionId.slice(0, 120) } : {}),
        ...(typeof session.branchedFromMessageId === "string" ? { branchedFromMessageId: session.branchedFromMessageId.slice(0, 120) } : {}),
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
  const safeMessages = session.messages.slice(-MAX_MESSAGES_PER_SESSION).flatMap((message) => {
    const sanitized = sanitizeMessage(message, session.id);
    return sanitized ? [sanitized] : [];
  });
  const project = existing?.project ?? session.project;
  const parentSessionId = existing?.parentSessionId ?? session.parentSessionId;
  const branchedFromMessageId = existing?.branchedFromMessageId ?? session.branchedFromMessageId;
  const safeSession: ArchivedSession = {
    id: session.id.slice(0, 120),
    title: existing?.customTitle ? existing.title : generatedTitle,
    model: session.model.slice(0, 120),
    createdAt: existing?.createdAt ?? session.createdAt ?? now,
    updatedAt: Number.isFinite(session.updatedAt) ? session.updatedAt : now,
    ...(existing?.pinned === true || session.pinned === true ? { pinned: true } : {}),
    ...(existing?.customTitle === true || session.customTitle === true ? { customTitle: true } : {}),
    ...(project?.trim() ? { project: project.trim().slice(0, 80) } : {}),
    ...(parentSessionId ? { parentSessionId: parentSessionId.slice(0, 120) } : {}),
    ...(branchedFromMessageId ? { branchedFromMessageId: branchedFromMessageId.slice(0, 120) } : {}),
    messages: safeMessages,
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
  return updateSession(id, (session) => ({ ...session, title: normalizedTitle, customTitle: true, updatedAt: Date.now() }));
}

export function toggleSessionPinned(id: string) {
  return updateSession(id, (session) => ({ ...session, pinned: session.pinned !== true }));
}

export function setSessionProject(id: string, project: string) {
  const normalized = project.trim().replace(/\s+/g, " ").slice(0, 80);
  return updateSession(id, (session) => {
    const next = { ...session, updatedAt: Date.now() };
    if (normalized) next.project = normalized;
    else delete next.project;
    return next;
  });
}

export function duplicateSession(id: string, title?: string) {
  const source = getSession(id);
  if (!source) return null;
  const now = Date.now();
  const duplicate: ArchivedSession = {
    ...source,
    id: createSessionId(),
    title: (title?.trim() || `${source.title} copy`).slice(0, 120),
    customTitle: true,
    pinned: false,
    createdAt: now,
    updatedAt: now,
    parentSessionId: source.id,
    messages: source.messages.map((message) => ({ ...message, id: createSessionId() })),
  };
  delete duplicate.branchedFromMessageId;
  persistArchive([duplicate, ...loadArchive()]);
  return duplicate;
}

export function branchSession(id: string, messageId: string, title?: string) {
  const source = getSession(id);
  if (!source) return null;
  const index = source.messages.findIndex((message) => message.id === messageId);
  if (index < 0) return null;
  const now = Date.now();
  const branch: ArchivedSession = {
    ...source,
    id: createSessionId(),
    title: (title?.trim() || `${source.title} · branch`).slice(0, 120),
    customTitle: true,
    pinned: false,
    createdAt: now,
    updatedAt: now,
    parentSessionId: source.id,
    branchedFromMessageId: messageId,
    messages: source.messages.slice(0, index + 1).map((message) => ({ ...message })),
  };
  persistArchive([branch, ...loadArchive()]);
  return branch;
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