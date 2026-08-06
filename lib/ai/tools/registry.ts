import { READ_ONLY_AI_TOOLS } from "@/lib/models/capabilities";
import type { AiToolName } from "@/lib/ai/types";

export const MAX_AI_TOOL_CALLS = 4;
export const MAX_AI_TOOL_ROUNDS = 3;
export const AI_TOOL_TIMEOUT_MS = 3_000;

export type NvidiaToolDefinition = {
  type: "function";
  function: {
    name: AiToolName;
    description: string;
    parameters: Record<string, unknown>;
  };
};

const limitedSearchSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    query: { type: "string", minLength: 1, maxLength: 160 },
    limit: { type: "integer", minimum: 1, maximum: 5, default: 3 },
  },
  required: ["query"],
} as const;

export const NVIDIA_READ_ONLY_TOOLS: readonly NvidiaToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "search_documentation",
      description: "Search the fixed internal TK LAB documentation index. It cannot open arbitrary URLs.",
      parameters: limitedSearchSchema,
    },
  },
  {
    type: "function",
    function: {
      name: "search_patch_notes",
      description: "Find TK LAB release notes by exact version or keywords and return internal release links.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          query: { type: "string", maxLength: 160 },
          versions: {
            type: "array",
            maxItems: 5,
            uniqueItems: true,
            items: { type: "string", pattern: "^v?[0-9]+\\.[0-9]+\\.[0-9]+$", maxLength: 24 },
          },
          limit: { type: "integer", minimum: 1, maximum: 5, default: 5 },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_service_status",
      description: "Read the current TK LAB service-health snapshot from the fixed internal status endpoint.",
      parameters: { type: "object", additionalProperties: false, properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "calculate",
      description: "Evaluate a basic arithmetic expression using numbers, parentheses, +, -, *, /, %, and ^. No code execution.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: { expression: { type: "string", minLength: 1, maxLength: 120 } },
        required: ["expression"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_local_archive",
      description: "Search the limited on-device conversation index supplied with this request. It never reads server storage.",
      parameters: limitedSearchSchema,
    },
  },
  {
    type: "function",
    function: {
      name: "get_model_capabilities",
      description: "Return the safe capability summary for an Erma model without exposing provider routing or secrets.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: { model: { type: "string", maxLength: 80 } },
      },
    },
  },
] as const;

const TOOL_NAME_SET = new Set<string>(READ_ONLY_AI_TOOLS);

export function isAllowedAiToolName(value: unknown): value is AiToolName {
  return typeof value === "string" && TOOL_NAME_SET.has(value);
}

export function shouldOfferReadOnlyTools(prompt: string) {
  const normalized = prompt.toLocaleLowerCase();
  if (/\bv?\d+\.\d+\.\d+\b/.test(normalized)) return true;
  if (/[0-9][0-9\s.+\-*/%^()]{2,}/.test(normalized)) return true;
  return /(?:patch\s*notes?|release|version|changelog|что нового|релиз|верси|обновлен|documentation|docs?|guide|help|документац|инструкц|справк|service\s*status|health|status|статус|доступност|работает ли|archive|history|conversation|архив|истори|диалог|model capabilit|tool calling|tools?|возможност.*модел|инструмент)/i.test(normalized);
}
