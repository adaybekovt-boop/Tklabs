export type ClodexServerModel = {
  key: string;
  name: string;
  providerModel: string;
  maxTokens: number;
  envKey: string;
};

export type ClodexModelEnvironment = Record<string, string | undefined>;

const CLODEX_SERVER_MODELS: readonly ClodexServerModel[] = [
  { key: "clodex:fast", name: "Clodex Fast", providerModel: "gemini-3.6-flash", maxTokens: 2048, envKey: "CLODEX_MODEL_FAST" },
  { key: "clodex:reasoning", name: "Clodex Reasoning", providerModel: "glm-5.2", maxTokens: 6144, envKey: "CLODEX_MODEL_REASONING" },
  { key: "clodex:pro", name: "Clodex Pro", providerModel: "gpt-5.6-sol", maxTokens: 8192, envKey: "CLODEX_MODEL_PRO" },
];

const MODEL_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/-]{1,127}$/;

export function isValidClodexModelId(value: unknown): value is string {
  return typeof value === "string" && MODEL_ID_PATTERN.test(value.trim());
}

export function areClodexModelIdsConfigured(environment: ClodexModelEnvironment) {
  return CLODEX_SERVER_MODELS.every((model) => isValidClodexModelId(environment[model.envKey]));
}

export function getClodexModel(key: string | undefined, options: { requireRuntimeConfig?: boolean; environment?: ClodexModelEnvironment } = {}) {
  const model = CLODEX_SERVER_MODELS.find((entry) => entry.key === key);
  if (!model) return undefined;
  const configured = (options.environment ?? process.env)[model.envKey]?.trim();
  const providerModel = configured || (options.requireRuntimeConfig ? "" : model.providerModel);
  if (!isValidClodexModelId(providerModel)) return undefined;
  return { ...model, providerModel };
}

export function getClodexModelConfig(options: { requireRuntimeConfig?: boolean; environment?: ClodexModelEnvironment } = {}) {
  const models = CLODEX_SERVER_MODELS.map((model) => getClodexModel(model.key, options));
  return models.every(Boolean) ? models as ClodexServerModel[] : null;
}
