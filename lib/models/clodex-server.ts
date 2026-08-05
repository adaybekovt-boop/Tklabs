import { CLODEX_MODELS } from "@/lib/models/clodex-public";

export type ClodexServerModel = {
  key: string;
  name: string;
  providerModel: string;
};

const CLODEX_SERVER_MODELS: readonly ClodexServerModel[] = [
  { key: "clodex:fast", name: "Clodex Fast", providerModel: "gemini-3.6-flash" },
  { key: "clodex:reasoning", name: "Clodex Reasoning", providerModel: "glm-5.2" },
  { key: "clodex:pro", name: "Clodex Pro", providerModel: "gpt-5.6-sol" },
];

export function getClodexModel(key: string | undefined) {
  const model = CLODEX_SERVER_MODELS.find((entry) => entry.key === key);
  return model && CLODEX_MODELS.some((publicModel) => publicModel.key === model.key) ? model : undefined;
}
