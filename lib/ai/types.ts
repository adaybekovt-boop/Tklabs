export type AiProvider = "nvidia" | "google" | "cerebras" | "groq" | "google-grounding" | "clodex" | "edge-fallback";

export type AiToolName =
  | "search_documentation"
  | "search_patch_notes"
  | "search_tklab_knowledge"
  | "search_documents"
  | "get_service_status"
  | "calculate"
  | "solve_math"
  | "search_local_archive"
  | "get_model_capabilities"
  | "search_web"
  | "open_web_result"
  | "run_code_sandbox";
export type AiToolCallStatus = "success" | "error" | "timeout" | "blocked";
export type AiToolCallLink = { label: string; href: string };
export type AiToolCallTrace = { id: string; name: AiToolName; status: AiToolCallStatus; durationMs: number; summary: string; links?: AiToolCallLink[] };

export type AiGroundingCitation = {
  title: string;
  url: string;
  startIndex?: number;
  endIndex?: number;
};

export type AiGroundingMeta = {
  provider: "google-search";
  directPassThrough: true;
  searchQueries: string[];
  citations: AiGroundingCitation[];
  searchSuggestionsHtml?: string;
};

export type AiProvenance = {
  schemaVersion: 1;
  aiGenerated: true;
  tkLabVersion: string;
  policyVersion: string;
  generatedAt: string;
  providerClass: "external-model-provider" | "local-fallback";
  productModel: string;
  actualProvider: AiProvider;
  humanEdited: false;
};

export type AiGenerationResult = { answer: string; reasoningUsed?: boolean; provider: AiProvider; actualModel: string; fallbackReason?: string; inputTokens?: number; outputTokens?: number; timeToFirstTokenMs?: number; contextMessageCount?: number; contextAttachmentCount?: number; contextLimit?: number; contextCompacted?: boolean; toolCalls?: AiToolCallTrace[]; grounding?: AiGroundingMeta };
export type AiResponseMeta = { requestId: string; requestedModel: string; actualProvider: AiProvider; actualModel: string; latencyMs: number; httpStatus: number; reasoningUsed?: boolean; fallbackReason?: string; inputTokens?: number; outputTokens?: number; timeToFirstTokenMs?: number; contextMessageCount?: number; contextAttachmentCount?: number; contextLimit?: number; contextCompacted?: boolean; toolCalls?: AiToolCallTrace[]; grounding?: AiGroundingMeta; provenance?: AiProvenance };
