export type ErmaTier = "light" | "medium" | "heavy";
export type ErmaModelStatus = "available" | "preview" | "planned";

export type PublicErmaModel = {
  key: string;
  name: string;
  tier: ErmaTier;
  status: ErmaModelStatus;
  available: boolean;
  reasoning: boolean;
  vision: false;
  tools: false;
  textAttachments: true;
};

/** Safe UI catalog. Provider IDs and server prompts intentionally do not live here. */
export const PUBLIC_ERMA_MODELS: readonly PublicErmaModel[] = [
  { key: "erma-spark-lite", name: "Erma Lite", tier: "light", status: "available", available: true, reasoning: false, vision: false, tools: false, textAttachments: true },
  { key: "erma-nutron", name: "Erma Core", tier: "medium", status: "available", available: true, reasoning: true, vision: false, tools: false, textAttachments: true },
  { key: "erma-apolon", name: "Erma Pro", tier: "heavy", status: "available", available: true, reasoning: true, vision: false, tools: false, textAttachments: true },
] as const;

export const DEFAULT_ERMA_MODEL_KEY = "erma-spark-lite";
export const PUBLIC_MAX_PROMPT_LENGTH = 2_000;
export const PRIVILEGED_MAX_PROMPT_LENGTH = 16_000;
export const DEMO_MAX_PROMPT_LENGTH = PUBLIC_MAX_PROMPT_LENGTH;
export const DEMO_DAILY_REQUEST_LIMIT = 3;
export const MAX_TOKENS_BY_TIER: Record<ErmaTier, number> = {
  light: 2048,
  medium: 4096,
  heavy: 8192,
};
