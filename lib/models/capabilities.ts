import type { AiToolName } from "@/lib/ai/types";

export const READ_ONLY_AI_TOOLS: readonly AiToolName[] = [
  "search_documentation",
  "search_patch_notes",
  "search_tklab_knowledge",
  "get_service_status",
  "calculate",
  "solve_math",
  "search_local_archive",
  "get_model_capabilities",
  "search_web",
  "open_web_result",
] as const;

export type ErmaToolCapabilities = {
  enabled: boolean;
  mode: "read-only";
  maxCalls: number;
  maxRounds: number;
  parallelCalls: false;
  requiresDetailedThinkingOff: boolean;
  tools: readonly AiToolName[];
};

export type ErmaServerCapabilities = {
  vision: boolean;
  reasoning: boolean;
  toolCalling: ErmaToolCapabilities;
};

const TOOL_CAPABILITIES: ErmaToolCapabilities = {
  enabled: true,
  mode: "read-only",
  maxCalls: 8,
  maxRounds: 3,
  parallelCalls: false,
  requiresDetailedThinkingOff: true,
  tools: READ_ONLY_AI_TOOLS,
};

/**
 * Server-only capability matrix. Provider model IDs remain outside the public
 * catalog so runtime compatibility can be changed without exposing routing.
 */
export const ERMA_SERVER_CAPABILITIES: Readonly<Record<string, ErmaServerCapabilities>> = {
  "erma-spark-lite": { vision: false, reasoning: false, toolCalling: TOOL_CAPABILITIES },
  "erma-nutron": { vision: false, reasoning: true, toolCalling: TOOL_CAPABILITIES },
  "erma-apolon": { vision: false, reasoning: true, toolCalling: TOOL_CAPABILITIES },
};

export function getErmaCapabilities(modelKey: string): ErmaServerCapabilities {
  return ERMA_SERVER_CAPABILITIES[modelKey] ?? {
    vision: false,
    reasoning: false,
    toolCalling: { ...TOOL_CAPABILITIES, enabled: false, tools: [] },
  };
}

export function publicErmaCapabilities(modelKey: string) {
  const capabilities = getErmaCapabilities(modelKey);
  return {
    vision: capabilities.vision,
    reasoning: capabilities.reasoning,
    tools: capabilities.toolCalling.enabled,
    toolMode: capabilities.toolCalling.mode,
    toolNames: [...capabilities.toolCalling.tools],
  } as const;
}
