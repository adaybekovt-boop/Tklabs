import type { ErmaModelStatus, ErmaTier } from "@/lib/models";

export type { ErmaTier };

export type PublicErmaModel = {
  key: string;
  name: string;
  tier: ErmaTier;
  status: ErmaModelStatus;
  available: boolean;
  reasoning: boolean;
  vision: boolean;
  tools: boolean;
};

/**
 * Hand-mirrored, provider-id-free copy of lib/models.ts ERMA_MODELS.
 * Client components must import the catalog from here, never from
 * lib/models.ts: that file also carries the real provider model ids and
 * persona system prompts, and bundlers ship an entire imported module to
 * the browser once any client component touches it — not just the export
 * actually used.
 */
export const PUBLIC_ERMA_MODELS: readonly PublicErmaModel[] = [
  { key: "erma-spark-lite", name: "Erma Lite", tier: "light", status: "available", available: true, reasoning: false, vision: false, tools: true },
  { key: "erma-nutron", name: "Erma Core", tier: "medium", status: "available", available: true, reasoning: true, vision: false, tools: true },
  { key: "erma-apolon", name: "Erma Pro", tier: "heavy", status: "available", available: true, reasoning: true, vision: false, tools: true },
] as const;

export const DEFAULT_ERMA_MODEL_KEY = "erma-spark-lite";
export const PUBLIC_MAX_PROMPT_LENGTH = 180;
export const PRIVILEGED_MAX_PROMPT_LENGTH = 16_000;

/** Mirrors the limits enforced in app/api/demo/route.ts, kept here so pages can display them honestly. */
export const DEMO_MAX_PROMPT_LENGTH = 180;
export const DEMO_DAILY_REQUEST_LIMIT = 3;
export const MAX_TOKENS_BY_TIER: Record<ErmaTier, number> = {
  light: 2048,
  medium: 4096,
  heavy: 8192,
};
