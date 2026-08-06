import { providerMessages, type ProviderChatMessage } from "@/lib/ai/chat-context";
import { AI_PRIVILEGED_SYSTEM_PROMPT, AI_SAFETY_SYSTEM_PROMPT, evaluateAssistantContent } from "@/lib/ai-safety";
import { fetchWithTimeout, PROVIDER_TIMEOUT_MS, withTimeout } from "@/lib/ai/provider-http";
import { normalizeAiTextPair } from "@/lib/ai/reasoning";
import { inferResponseLanguage, responseLanguageInstruction, type ResponseLanguage } from "@/lib/ai/response-language";
import { getErmaSystemPrompt, type ErmaModel, type ErmaTone } from "@/lib/models/server";

export const NVIDIA_ENDPOINT = "https://integrate.api.nvidia.com/v1/chat/completions";
const NVIDIA_KEY_COOLDOWN_MS = 15 * 60 * 1000;

type Language = "ru" | "en";
type ReasoningEffort = "low" | "medium" | "high";
type NvidiaChoice = {
  delta?: { content?: string | null; reasoning_content?: string | null };
  message?: { content?: string | null; reasoning_content?: string | null };
  text?: string | null;
};
type NvidiaPayload = { choices?: NvidiaChoice[] };

export class NvidiaKeyRotationError extends Error {
  readonly cooldownMs: number;

  constructor(cooldownMs = NVIDIA_KEY_COOLDOWN_MS) {
    super("nvidia_key_rejected");
    this.name = "NvidiaKeyRotationError";
    this.cooldownMs = cooldownMs;
  }
}

let preferredNvidiaKeyIndex = 0;
const nvidiaKeyCooldowns = new Map<string, number>();

function getNvidiaApiKeys() {
  const primary = process.env.NVIDIA_API_KEY_PRIMARY?.trim() || process.env.NVIDIA_API_KEY_1?.trim() || process.env.NVIDIA_API_KEY?.trim() || "";
  const secondary = process.env.NVIDIA_API_KEY_SECONDARY?.trim() || process.env.NVIDIA_API_KEY_2?.trim() || "";
  return [primary, secondary].filter((key, index, keys): key is string => Boolean(key) && keys.indexOf(key) === index);
}

function availableKeyIndexes(keys: string[]) {
  if (!keys.length) return [];
  const start = preferredNvidiaKeyIndex % keys.length;
  return keys.map((_, offset) => (start + offset) % keys.length).filter((index) => (nvidiaKeyCooldowns.get(keys[index]) ?? 0) <= Date.now());
}

function markKeyUnavailable(key: string, cooldownMs: number) {
  nvidiaKeyCooldowns.set(key, Date.now() + Math.max(cooldownMs, 60_000));
}

function normalizeEffort(value: unknown): ReasoningEffort {
  return value === "low" || value === "high" ? value : "medium";
}

function maxTokensFor(model: ErmaModel, effort: ReasoningEffort) {
  if (model.tier === "heavy") return effort === "low" ? 4096 : effort === "high" ? 8192 : 6144;
  if (model.tier === "medium") return effort === "low" ? 1536 : effort === "high" ? 4096 : 3072;
  return effort === "low" ? 1024 : effort === "high" ? 2048 : 1536;
}

function reasoningBudgetFor(model: ErmaModel, effort: ReasoningEffort) {
  const maxBudget = model.tier === "heavy" ? 8192 : model.tier === "medium" ? 4096 : 2048;
  if (effort === "low") return Math.min(1024, maxBudget);
  if (effort === "high") return maxBudget;
  return Math.min(2048, maxBudget);
}

function systemPrompt(language: ResponseLanguage, model: ErmaModel, allowCode: boolean, tone: ErmaTone) {
  return `${getErmaSystemPrompt(model, tone)}\n\n${responseLanguageInstruction(language)}\n\n${allowCode ? AI_PRIVILEGED_SYSTEM_PROMPT : AI_SAFETY_SYSTEM_PROMPT}`;
}

export function buildNvidiaBody(
  prompt: string,
  interfaceLanguage: Language,
  model: ErmaModel,
  requestedReasoning: boolean,
  effort: ReasoningEffort,
  allowCode: boolean,
  tone: ErmaTone,
  history: ProviderChatMessage[] = [],
  stream = false,
) {
  const reasoningEnabled = requestedReasoning;
  const responseLanguage = inferResponseLanguage(prompt, interfaceLanguage);
  const body: Record<string, unknown> = {
    model: model.nvidiaModel,
    messages: providerMessages(systemPrompt(responseLanguage, model, allowCode, tone), history, prompt),
    temperature: tone === "erma" ? (reasoningEnabled ? 0.62 : 0.7) : tone === "character" ? (reasoningEnabled ? 0.58 : 0.65) : (reasoningEnabled ? 0.42 : 0.32),
    top_p: tone === "erma" ? 0.95 : tone === "character" ? 0.93 : 0.88,
    max_tokens: maxTokensFor(model, effort),
    stream,
  };
  if (reasoningEnabled && model.nvidiaModel?.startsWith("nvidia/nemotron")) {
    body.chat_template_kwargs = { enable_thinking: true };
    body.reasoning_budget = reasoningBudgetFor(model, effort);
  }
  return body;
}

function choiceText(choice: NvidiaChoice | undefined) {
  return {
    answer: choice?.delta?.content ?? choice?.message?.content ?? choice?.text ?? "",
    thinking: choice?.delta?.reasoning_content ?? choice?.message?.reasoning_content ?? "",
  };
}

async function collectNvidiaStream(response: Response) {
  if (!response.body) throw new Error("nvidia_empty_response");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let answer = "";
  let thinking = "";

  function consume(line: string) {
    if (!line.startsWith("data:")) return;
    const data = line.slice(5).trim();
    if (!data || data === "[DONE]") return;
    const payload = JSON.parse(data) as NvidiaPayload;
    const text = choiceText(payload.choices?.[0]);
    answer += text.answer;
    thinking += text.thinking;
  }

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let newline = buffer.indexOf("\n");
    while (newline >= 0) {
      consume(buffer.slice(0, newline).trim());
      buffer = buffer.slice(newline + 1);
      newline = buffer.indexOf("\n");
    }
  }
  buffer += decoder.decode();
  if (buffer.trim()) consume(buffer.trim());
  return { answer, thinking };
}

async function collectNvidiaJson(response: Response) {
  const payload = (await withTimeout(response.json().catch(() => null))) as NvidiaPayload | null;
  return choiceText(payload?.choices?.[0]);
}

async function fetchWithKey(
  prompt: string,
  language: Language,
  model: ErmaModel,
  apiKey: string,
  requestedReasoning: boolean,
  effort: ReasoningEffort,
  allowCode: boolean,
  tone: ErmaTone,
  history: ProviderChatMessage[],
  stream: boolean,
  signal?: AbortSignal,
) {
  const response = await fetchWithTimeout(NVIDIA_ENDPOINT, {
    method: "POST",
    signal,
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
      accept: stream ? "text/event-stream" : "application/json",
    },
    body: JSON.stringify(buildNvidiaBody(prompt, language, model, requestedReasoning, effort, allowCode, tone, history, stream)),
  });
  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    const shouldRotate = [401, 402, 403, 429].includes(response.status) || /quota|rate[ -]?limit|too many|credit|limit exceeded|exhausted|throttl/i.test(errorText);
    if (shouldRotate) throw new NvidiaKeyRotationError();
    throw Object.assign(new Error("nvidia_http_error"), { status: response.status });
  }

  const providerOutput = stream
    ? await withTimeout(collectNvidiaStream(response), PROVIDER_TIMEOUT_MS)
    : await withTimeout(collectNvidiaJson(response), PROVIDER_TIMEOUT_MS);
  const normalized = normalizeAiTextPair({ answer: providerOutput.answer.trim(), thinking: providerOutput.thinking.trim() || undefined });
  if (!normalized.answer) throw new Error("nvidia_empty_response");
  const evaluation = evaluateAssistantContent(normalized, { allowCode });
  if (evaluation.verdict === "unsafe") throw new Error("nvidia_output_blocked");
  if (evaluation.verdict === "empty") throw new Error("nvidia_empty_response");
  return { answer: evaluation.answer, reasoningUsed: evaluation.reasoningUsed };
}

export async function generateWithNvidia(input: {
  prompt: string;
  language: Language;
  model: ErmaModel;
  requestedReasoning: boolean;
  effort: ReasoningEffort;
  allowCode: boolean;
  tone: ErmaTone;
  history?: ProviderChatMessage[];
  stream?: boolean;
  signal?: AbortSignal;
}) {
  const keys = getNvidiaApiKeys();
  const indexes = availableKeyIndexes(keys);
  if (!indexes.length) throw new Error("nvidia_not_configured");

  let lastRotationError: NvidiaKeyRotationError | undefined;
  for (const index of indexes) {
    try {
      const result = await withTimeout(fetchWithKey(
        input.prompt,
        input.language,
        input.model,
        keys[index],
        input.requestedReasoning,
        normalizeEffort(input.effort),
        input.allowCode,
        input.tone,
        input.history ?? [],
        input.stream === true,
        input.signal,
      ), PROVIDER_TIMEOUT_MS);
      preferredNvidiaKeyIndex = index;
      return { answer: result.answer, reasoningUsed: result.reasoningUsed, actualModel: input.model.nvidiaModel ?? "nvidia-model" };
    } catch (error) {
      if (!(error instanceof NvidiaKeyRotationError)) throw error;
      lastRotationError = error;
      markKeyUnavailable(keys[index], error.cooldownMs);
    }
  }
  throw lastRotationError ?? new Error("nvidia_unavailable");
}
