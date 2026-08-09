export type ErmaTier = "light" | "medium" | "heavy";
export type ErmaModelStatus = "available" | "preview" | "planned";
export type PublicReasoningEffort = "low" | "medium" | "high";

export type PublicErmaModel = {
  key: string;
  name: string;
  tier: ErmaTier;
  status: ErmaModelStatus;
  available: boolean;
  reasoning: boolean;
  vision: boolean;
  tools: boolean;
  toolMode: "read-only" | "none";
  textAttachments: true;
};

const READ_ONLY_TOOLS_ENABLED = true;

export const AUTO_ERMA_MODEL_KEY = "erma-auto";

/** Virtual user-facing route. The server still owns provider IDs and capability enforcement. */
export const PUBLIC_ERMA_AUTO_MODEL: PublicErmaModel = {
  key: AUTO_ERMA_MODEL_KEY,
  name: "Erma · Auto",
  tier: "medium",
  status: "available",
  available: true,
  reasoning: true,
  vision: false,
  tools: READ_ONLY_TOOLS_ENABLED,
  toolMode: "read-only",
  textAttachments: true,
};

/** Safe UI catalog. Provider IDs and server prompts intentionally do not live here. */
export const PUBLIC_ERMA_MODELS: readonly PublicErmaModel[] = [
  { key: "erma-spark-lite", name: "Erma Celer", tier: "light", status: "available", available: true, reasoning: false, vision: false, tools: READ_ONLY_TOOLS_ENABLED, toolMode: "read-only", textAttachments: true },
  { key: "erma-nutron", name: "Erma Nova", tier: "medium", status: "available", available: true, reasoning: true, vision: false, tools: READ_ONLY_TOOLS_ENABLED, toolMode: "read-only", textAttachments: true },
  { key: "erma-apolon", name: "Erma Optima", tier: "heavy", status: "available", available: true, reasoning: true, vision: false, tools: READ_ONLY_TOOLS_ENABLED, toolMode: "read-only", textAttachments: true },
] as const;

export function resolveAutoErmaModelKey(prompt: string, options: { reasoning?: boolean; effort?: PublicReasoningEffort } = {}) {
  const normalized = prompt.toLocaleLowerCase();
  const length = Array.from(prompt).length;
  let score = 0;
  if (length >= 500) score += 1;
  if (length >= 1_200) score += 1;
  if (options.reasoning) score += 1;
  if (options.effort === "high") score += 2;
  else if (options.effort === "medium") score += 1;
  if (/```|\b(?:architecture|архитектур|refactor|рефактор|migration|миграц|debug|отлад|algorithm|алгоритм|proof|доказ|compare|сравн|audit|аудит|design|проектир)\b/i.test(normalized)) score += 2;
  if (/\b(?:short|brief|кратко|быстро|одним предложением)\b/i.test(normalized)) score -= 1;
  if (score >= 5) return "erma-apolon";
  if (score >= 2) return "erma-nutron";
  return "erma-spark-lite";
}

export const DEFAULT_ERMA_MODEL_KEY = AUTO_ERMA_MODEL_KEY;
export const PUBLIC_MAX_PROMPT_LENGTH = 2_000;
export const PRIVILEGED_MAX_PROMPT_LENGTH = 16_000;
export const DEMO_MAX_PROMPT_LENGTH = PUBLIC_MAX_PROMPT_LENGTH;
export const DEMO_DAILY_REQUEST_LIMIT = 3;
export const MAX_TOKENS_BY_TIER: Record<ErmaTier, number> = {
  light: 2048,
  medium: 4096,
  heavy: 8192,
};
