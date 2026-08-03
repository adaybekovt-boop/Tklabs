export type ErmaTier = "light" | "medium" | "heavy";
export type ErmaModelStatus = "available" | "preview" | "planned";

export type ErmaModel = {
  key: string;
  name: string;
  tier: ErmaTier;
  nvidiaModel: string | null;
  status: ErmaModelStatus;
  available: boolean;
  reasoning: boolean;
  vision: boolean;
  tools: boolean;
};

/**
 * Public Erma names are product aliases. The NVIDIA model IDs stay here on
 * the server side so the browser can only request a known catalog entry.
 */
export const ERMA_MODELS: readonly ErmaModel[] = [
  {
    key: "erma-spark-lite",
    name: "ErmaSpark lite 0.9",
    tier: "light",
    nvidiaModel: "nvidia/nemotron-3-nano-30b-a3b",
    status: "available",
    available: true,
    reasoning: false,
    vision: false,
    tools: true,
  },
  {
    key: "erma-instant",
    name: "Erma 1.0 instant",
    tier: "light",
    nvidiaModel: "nvidia/nemotron-3-nano-30b-a3b",
    status: "available",
    available: true,
    reasoning: false,
    vision: false,
    tools: true,
  },
  {
    key: "erma-polos",
    name: "Erma Polos 1.0 think",
    tier: "light",
    nvidiaModel: "nvidia/nemotron-3-nano-30b-a3b",
    status: "available",
    available: true,
    reasoning: true,
    vision: false,
    tools: true,
  },
  {
    key: "erma-code-lite",
    name: "Erma-code-lite",
    tier: "medium",
    nvidiaModel: "qwen/qwen2.5-coder-32b-instruct",
    status: "available",
    available: true,
    reasoning: false,
    vision: false,
    tools: true,
  },
  {
    key: "erma-dalos",
    name: "Erma Dalos 1.1",
    tier: "medium",
    nvidiaModel: "minimaxai/minimax-m2.7",
    status: "available",
    available: true,
    reasoning: true,
    vision: false,
    tools: true,
  },
  {
    key: "erma-nutron",
    name: "Erma nutron 1.2 think",
    tier: "medium",
    nvidiaModel: "nvidia/nemotron-3-super-120b-a12b",
    status: "available",
    available: true,
    reasoning: true,
    vision: false,
    tools: true,
  },
  {
    key: "erma-reborn",
    name: "Erma reborn 1.3 think",
    tier: "heavy",
    nvidiaModel: "nvidia/nemotron-3-ultra-550b-a55b",
    status: "available",
    available: true,
    reasoning: true,
    vision: false,
    tools: true,
  },
  {
    key: "erma-apolon",
    name: "Erma apolon 1.4",
    tier: "heavy",
    nvidiaModel: "deepseek-ai/deepseek-v4-pro",
    status: "available",
    available: true,
    reasoning: true,
    vision: false,
    tools: true,
  },
  {
    key: "erma-asimasi",
    name: "Erma AsiMasi 2 preview",
    tier: "heavy",
    nvidiaModel: "minimaxai/minimax-m3",
    status: "preview",
    available: true,
    reasoning: true,
    vision: true,
    tools: true,
  },
] as const;

export const DEFAULT_ERMA_MODEL_KEY = "erma-spark-lite";

export function getErmaModel(key: string | undefined): ErmaModel {
  return ERMA_MODELS.find((model) => model.key === key) ?? ERMA_MODELS[0];
}
