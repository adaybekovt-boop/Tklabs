export const ARTIFACT_SCHEMA_VERSION = 2 as const;

export type ArtifactKind = "document" | "plan" | "table" | "code" | "json" | "csv";

export interface ArtifactVersion {
  id: string;
  content: string;
  createdAt: number;
  label?: string;
}

export interface WorkspaceArtifact {
  schemaVersion: typeof ARTIFACT_SCHEMA_VERSION;
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
  createdAt: number;
  updatedAt: number;
  versions: ArtifactVersion[];
  favorite: boolean;
  sourceSessionId?: string;
  sourceRunId?: string;
  sourceDocumentName?: string;
}
