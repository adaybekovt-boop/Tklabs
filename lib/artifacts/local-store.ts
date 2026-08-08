import { ARTIFACT_SCHEMA_VERSION, type ArtifactKind, type ArtifactVersion, type WorkspaceArtifact } from "@/lib/artifacts/types";

const STORAGE_KEY = "tklabs.workspace-artifacts.v1";
const MAX_ARTIFACTS = 24;
const MAX_VERSIONS = 20;
const MAX_CONTENT_LENGTH = 200_000;

function id() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function cleanText(value: unknown, limit: number) {
  return typeof value === "string" ? value.replace(/\u0000/g, "").slice(0, limit) : "";
}

function optionalText(value: unknown, limit: number) {
  const text = cleanText(value, limit).trim();
  return text || undefined;
}

function isKind(value: unknown): value is ArtifactKind {
  return value === "document" || value === "plan" || value === "table" || value === "code" || value === "json" || value === "csv";
}

function sanitizeVersion(value: unknown): ArtifactVersion | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Partial<ArtifactVersion>;
  if (typeof input.id !== "string" || typeof input.createdAt !== "number") return null;
  return {
    id: input.id,
    content: cleanText(input.content, MAX_CONTENT_LENGTH),
    createdAt: input.createdAt,
    ...(typeof input.label === "string" ? { label: cleanText(input.label, 80) } : {}),
  };
}

function sanitizeArtifact(value: unknown): WorkspaceArtifact | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Partial<WorkspaceArtifact> & { schemaVersion?: unknown };
  if (typeof input.id !== "string" || !isKind(input.kind) || typeof input.createdAt !== "number" || typeof input.updatedAt !== "number") return null;
  return {
    schemaVersion: ARTIFACT_SCHEMA_VERSION,
    id: input.id,
    title: cleanText(input.title, 120) || "Untitled artifact",
    kind: input.kind,
    content: cleanText(input.content, MAX_CONTENT_LENGTH),
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
    versions: Array.isArray(input.versions)
      ? input.versions.map(sanitizeVersion).filter((entry): entry is ArtifactVersion => Boolean(entry)).slice(-MAX_VERSIONS)
      : [],
    favorite: input.favorite === true,
    ...(optionalText(input.sourceSessionId, 120) ? { sourceSessionId: optionalText(input.sourceSessionId, 120) } : {}),
    ...(optionalText(input.sourceRunId, 120) ? { sourceRunId: optionalText(input.sourceRunId, 120) } : {}),
    ...(optionalText(input.sourceDocumentName, 120) ? { sourceDocumentName: optionalText(input.sourceDocumentName, 120) } : {}),
  };
}

export function loadArtifacts(): WorkspaceArtifact[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.map(sanitizeArtifact).filter((entry): entry is WorkspaceArtifact => Boolean(entry)).slice(-MAX_ARTIFACTS);
  } catch {
    return [];
  }
}

export function saveArtifacts(artifacts: WorkspaceArtifact[]) {
  if (typeof window === "undefined") return;
  const safe = artifacts.map(sanitizeArtifact).filter((entry): entry is WorkspaceArtifact => Boolean(entry)).slice(-MAX_ARTIFACTS);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(safe));
  } catch {
    // A full or restricted storage area must not break the workspace UI.
  }
}

export function createArtifact(kind: ArtifactKind = "document", title = "Untitled artifact", source?: { sessionId?: string; runId?: string; documentName?: string }): WorkspaceArtifact {
  const now = Date.now();
  return {
    schemaVersion: ARTIFACT_SCHEMA_VERSION,
    id: id(),
    title: cleanText(title, 120) || "Untitled artifact",
    kind,
    content: "",
    createdAt: now,
    updatedAt: now,
    versions: [],
    favorite: false,
    ...(optionalText(source?.sessionId, 120) ? { sourceSessionId: optionalText(source?.sessionId, 120) } : {}),
    ...(optionalText(source?.runId, 120) ? { sourceRunId: optionalText(source?.runId, 120) } : {}),
    ...(optionalText(source?.documentName, 120) ? { sourceDocumentName: optionalText(source?.documentName, 120) } : {}),
  };
}

export function updateArtifact(artifact: WorkspaceArtifact, update: {
  title?: string;
  kind?: ArtifactKind;
  content?: string;
  versionLabel?: string;
  favorite?: boolean;
  sourceSessionId?: string;
  sourceRunId?: string;
  sourceDocumentName?: string;
}): WorkspaceArtifact {
  const nextContent = update.content === undefined ? artifact.content : cleanText(update.content, MAX_CONTENT_LENGTH);
  const changedContent = nextContent !== artifact.content;
  const versions = changedContent && artifact.content
    ? [...artifact.versions, { id: id(), content: artifact.content, createdAt: Date.now(), ...(update.versionLabel ? { label: cleanText(update.versionLabel, 80) } : {}) }].slice(-MAX_VERSIONS)
    : artifact.versions;
  return {
    ...artifact,
    title: update.title === undefined ? artifact.title : cleanText(update.title, 120) || artifact.title,
    kind: update.kind ?? artifact.kind,
    content: nextContent,
    versions,
    favorite: update.favorite ?? artifact.favorite,
    ...(update.sourceSessionId === undefined ? {} : { sourceSessionId: optionalText(update.sourceSessionId, 120) }),
    ...(update.sourceRunId === undefined ? {} : { sourceRunId: optionalText(update.sourceRunId, 120) }),
    ...(update.sourceDocumentName === undefined ? {} : { sourceDocumentName: optionalText(update.sourceDocumentName, 120) }),
    updatedAt: Date.now(),
  };
}

export function snapshotArtifact(artifact: WorkspaceArtifact, label = "Saved version"): WorkspaceArtifact {
  const version: ArtifactVersion = {
    id: id(),
    content: artifact.content,
    createdAt: Date.now(),
    label: cleanText(label, 80) || "Saved version",
  };
  return { ...artifact, versions: [...artifact.versions, version].slice(-MAX_VERSIONS), updatedAt: Date.now() };
}

export function duplicateArtifact(artifact: WorkspaceArtifact): WorkspaceArtifact {
  const now = Date.now();
  return {
    ...artifact,
    id: id(),
    title: `${artifact.title} copy`.slice(0, 120),
    createdAt: now,
    updatedAt: now,
    versions: [],
    favorite: false,
  };
}

export function toggleArtifactFavorite(artifact: WorkspaceArtifact): WorkspaceArtifact {
  return { ...artifact, favorite: !artifact.favorite, updatedAt: Date.now() };
}

export function restoreArtifactVersion(artifact: WorkspaceArtifact, versionId: string): WorkspaceArtifact {
  const version = artifact.versions.find((entry) => entry.id === versionId);
  return version ? updateArtifact(artifact, { content: version.content, versionLabel: "Before restore" }) : artifact;
}

export function artifactFileExtension(kind: ArtifactKind) {
  if (kind === "json") return "json";
  if (kind === "csv" || kind === "table") return "csv";
  if (kind === "code") return "txt";
  return "md";
}
