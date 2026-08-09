import type { ChatContextMessage } from "@/lib/ai/context";
import type { AiProvider } from "@/lib/ai/types";
import type { ChatImageAttachment } from "@/lib/chat-prompt";
import type { ErmaModel, ErmaTone } from "@/lib/models/server";

export type ErmaLanguage = "ru" | "en";
export type ErmaReasoningEffort = "low" | "medium" | "high";
export type ErmaInferenceProvider = Extract<AiProvider, "google" | "cerebras" | "groq" | "nvidia">;
export type ErmaProviderLane = "google-fast" | "google-core" | "cerebras" | "groq" | "nvidia";

export type ErmaGenerationInput = {
  prompt?: string;
  messages?: ChatContextMessage[];
  summary?: string;
  language: ErmaLanguage;
  model: ErmaModel;
  requestedReasoning: boolean;
  effort: ErmaReasoningEffort;
  allowCode: boolean;
  tone: ErmaTone;
  images?: ChatImageAttachment[];
  signal?: AbortSignal;
  requestId?: string;
  fairnessKey?: string;
  estimatedInputTokens?: number;
};

export type ErmaProviderGenerationResult = {
  answer: string;
  reasoningUsed?: boolean;
  provider: ErmaInferenceProvider;
  actualModel: string;
  fallbackReason?: string;
  inputTokens?: number;
  outputTokens?: number;
};

export type ProviderLease = {
  leaseId: string;
  lane: ErmaProviderLane;
  mode: "normal" | "high" | "survival";
};

export type ProviderLeaseResult =
  | { granted: true; lease: ProviderLease }
  | { granted: false; mode: "normal" | "high" | "survival"; retryAfterMs: number };

export type ProviderLeaseOutcome = {
  leaseId: string;
  ok: boolean;
  status?: number;
  latencyMs: number;
};
