export type ClodexModel = {
  key: string;
  id: string;
};

/** Public model names only; authorization happens on the server. */
export const CLODEX_MODELS: readonly ClodexModel[] = [
  { key: "clodex:deepseek-v4-flash", id: "deepseek-v4-flash" },
  { key: "clodex:deepseek-v4-pro", id: "deepseek-v4-pro" },
  { key: "clodex:gemini-3.6-flash-tiered", id: "gemini-3.6-flash-tiered" },
  { key: "clodex:glm-5.1", id: "glm-5.1" },
  { key: "clodex:glm-5.2", id: "glm-5.2" },
  { key: "clodex:gpt-5.6-luna", id: "gpt-5.6-luna" },
  { key: "clodex:gpt-5.6-sol", id: "gpt-5.6-sol" },
  { key: "clodex:gpt-5.6-terra", id: "gpt-5.6-terra" },
  { key: "clodex:Kimi-K2", id: "Kimi-K2" },
  { key: "clodex:Kimi-K2-Thinking", id: "Kimi-K2-Thinking" },
  { key: "clodex:kimi-k2.5", id: "kimi-k2.5" },
  { key: "clodex:kimi-k2.6", id: "kimi-k2.6" },
  { key: "clodex:kimi-k3", id: "kimi-k3" },
  { key: "clodex:MiniMax-M2.7", id: "MiniMax-M2.7" },
  { key: "clodex:MiniMax-M3", id: "MiniMax-M3" },
] as const;

export function getClodexModel(key: string | undefined): ClodexModel | undefined {
  return CLODEX_MODELS.find((model) => model.key === key);
}
