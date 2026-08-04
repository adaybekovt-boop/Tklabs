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
  { key: "erma-spark-lite", name: "ErmaSpark lite 0.9", tier: "light", status: "available", available: true, reasoning: false, vision: false, tools: true },
  { key: "erma-instant", name: "Erma 1.0 instant", tier: "light", status: "available", available: true, reasoning: false, vision: false, tools: true },
  { key: "erma-polos", name: "Erma Polos 1.0 think", tier: "light", status: "available", available: true, reasoning: true, vision: false, tools: true },
  { key: "erma-dalos", name: "Erma Dalos 1.1", tier: "medium", status: "available", available: true, reasoning: true, vision: false, tools: true },
  { key: "erma-nutron", name: "Erma nutron 1.2 think", tier: "medium", status: "available", available: true, reasoning: true, vision: false, tools: true },
  { key: "erma-reborn", name: "Erma reborn 1.3 think", tier: "heavy", status: "available", available: true, reasoning: true, vision: false, tools: true },
  { key: "erma-apolon", name: "Erma apolon 1.4", tier: "heavy", status: "available", available: true, reasoning: true, vision: false, tools: true },
  { key: "erma-asimasi", name: "Erma AsiMasi 2 preview", tier: "heavy", status: "preview", available: true, reasoning: true, vision: true, tools: true },
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
