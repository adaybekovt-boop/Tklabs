import { CLODEX_MODELS } from "@/lib/models/clodex-public";

export type ClodexServerModel = {
  key: string;
  name: string;
  providerModel: string;
};

const CLODEX_SERVER_MODELS: readonly ClodexServerModel[] = [
  { key: "clodex:fast", name: "Clodex Fast", providerModel: "deepseek-v4-flash" },
  { key: "clodex:reasoning", name: "Clodex Reasoning", providerModel: "Kimi-K2-Thinking" },
  { key: "clodex:pro", name: "Clodex Pro", providerModel: "deepseek-v4-pro" },
];

export function getClodexModel(key: string | undefined) {
  const model = CLODEX_SERVER_MODELS.find((entry) => entry.key === key);
  return model && CLODEX_MODELS.some((publicModel) => publicModel.key === model.key) ? model : undefined;
}
