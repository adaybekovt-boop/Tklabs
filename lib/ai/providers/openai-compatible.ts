import {
  PROVIDER_STREAM_IDLE_TIMEOUT_MS,
  PROVIDER_STREAM_TOTAL_TIMEOUT_MS,
  PROVIDER_TIMEOUT_MS,
  withProviderResponse,
} from "@/lib/ai/provider-http";

import type { ErmaGenerationInput, ErmaInferenceProvider, ErmaProviderGenerationResult } from "./contracts";
import {
  STREAM_ANSWER_LIMIT_CHARACTERS,
  STREAM_SAFETY_WINDOW_CHARACTERS,
  assertStreamingWindowSafe,
  ermaSystemPrompt,
  evaluateProviderText,
  maxOutputTokensFor,
  messagesForErmaInput,
  parseSsePayload,
} from "./shared";

type OpenAiProvider = Extract<ErmaInferenceProvider, "cerebras" | "groq">;
type OpenAiUsage = { prompt_tokens?: number; completion_tokens?: number };
type OpenAiPayload = {
  model?: string;
  choices?: Array<{
    message?: { content?: string | null; reasoning?: string | null; reasoning_content?: string | null };
    delta?: { content?: string | null; reasoning?: string | null; reasoning_content?: string | null };
  }>;
  usage?: OpenAiUsage;
};

type ProviderConfig = {
  id: OpenAiProvider;
  endpoint: string;
  apiKey: string;
  model: string;
};

function providerConfig(provider: OpenAiProvider): ProviderConfig | null {
  if (provider === "cerebras") {
    const apiKey = process.env.CEREBRAS_API_KEY?.trim() ?? "";
    if (!apiKey) return null;
    return {
      id: provider,
      endpoint: "https://api.cerebras.ai/v1/chat/completions",
      apiKey,
      model: process.env.CEREBRAS_MODEL?.trim() || "gpt-oss-120b",
    };
  }
  const apiKey = process.env.GROQ_API_KEY?.trim() ?? "";
  if (!apiKey) return null;
  return {
    id: provider,
    endpoint: "https://api.groq.com/openai/v1/chat/completions",
    apiKey,
    model: process.env.GROQ_MODEL?.trim() || "openai/gpt-oss-120b",
  };
}

export function isOpenAiCompatibleProviderConfigured(provider: OpenAiProvider) {
  return Boolean(providerConfig(provider));
}

function bodyFor(input: ErmaGenerationInput, config: ProviderConfig, stream: boolean) {
  if (input.images?.length) throw new Error(`${config.id}_vision_not_supported`);
  const messages = messagesForErmaInput(input);
  return {
    model: config.model,
    messages: [
      { role: "system", content: ermaSystemPrompt(input, messages) },
      ...messages,
    ],
    max_tokens: maxOutputTokensFor(input.model.tier, input.effort),
    stream,
  };
}

function httpError(provider: OpenAiProvider, status: number) {
  return Object.assign(new Error(`${provider}_http_error`), { status });
}

export async function generateWithOpenAiCompatible(
  provider: OpenAiProvider,
  input: ErmaGenerationInput,
): Promise<ErmaProviderGenerationResult> {
  const config = providerConfig(provider);
  if (!config) throw new Error(`${provider}_not_configured`);
  return withProviderResponse(config.endpoint, {
    method: "POST",
    signal: input.signal,
    headers: {
      authorization: `Bearer ${config.apiKey}`,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify(bodyFor(input, config, false)),
  }, async (response) => {
    if (!response.ok) throw httpError(provider, response.status);
    const payload = (await response.json().catch(() => null)) as OpenAiPayload | null;
    const message = payload?.choices?.[0]?.message;
    const answer = typeof message?.content === "string" ? message.content : "";
    const thinking = typeof message?.reasoning === "string"
      ? message.reasoning
      : typeof message?.reasoning_content === "string"
        ? message.reasoning_content
        : undefined;
    const evaluated = evaluateProviderText(answer, thinking, input.allowCode, provider);
    return {
      ...evaluated,
      provider,
      actualModel: payload?.model?.trim() || config.model,
      inputTokens: payload?.usage?.prompt_tokens,
      outputTokens: payload?.usage?.completion_tokens,
    };
  }, { timeoutMs: PROVIDER_TIMEOUT_MS });
}

export async function streamWithOpenAiCompatible(
  provider: OpenAiProvider,
  input: ErmaGenerationInput,
  onDelta: (delta: string) => void | Promise<void>,
): Promise<ErmaProviderGenerationResult> {
  const config = providerConfig(provider);
  if (!config) throw new Error(`${provider}_not_configured`);
  return withProviderResponse(config.endpoint, {
    method: "POST",
    signal: input.signal,
    headers: {
      authorization: `Bearer ${config.apiKey}`,
      "content-type": "application/json",
      accept: "text/event-stream",
    },
    body: JSON.stringify(bodyFor(input, config, true)),
  }, async (response, lifecycle) => {
    if (!response.ok) throw httpError(provider, response.status);
    if (!response.body) throw new Error(`${provider}_empty_stream`);

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let answer = "";
    let thinking = "";
    let actualModel = config.model;
    let usage: OpenAiUsage | undefined;

    const consume = async (raw: string) => {
      const data = parseSsePayload(raw);
      if (!data || data === "[DONE]") return;
      const payload = JSON.parse(data) as OpenAiPayload;
      if (payload.model?.trim()) actualModel = payload.model.trim();
      if (payload.usage) usage = payload.usage;
      const delta = payload.choices?.[0]?.delta;
      const thought = typeof delta?.reasoning === "string"
        ? delta.reasoning
        : typeof delta?.reasoning_content === "string"
          ? delta.reasoning_content
          : "";
      if (thought) thinking += thought;
      const text = typeof delta?.content === "string" ? delta.content : "";
      if (!text) return;
      if (answer.length + text.length > STREAM_ANSWER_LIMIT_CHARACTERS) throw new Error(`${provider}_output_too_large`);
      answer += text;
      assertStreamingWindowSafe(answer.slice(-STREAM_SAFETY_WINDOW_CHARACTERS), input.allowCode, provider);
      await onDelta(text);
    };

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      lifecycle.touch();
      buffer += decoder.decode(value, { stream: true });
      const blocks = buffer.split(/\r?\n\r?\n/);
      buffer = blocks.pop() ?? "";
      for (const block of blocks) await consume(block);
    }
    buffer += decoder.decode();
    if (buffer.trim()) await consume(buffer);

    const evaluated = evaluateProviderText(answer, thinking || undefined, input.allowCode, provider);
    return {
      ...evaluated,
      provider,
      actualModel,
      inputTokens: usage?.prompt_tokens,
      outputTokens: usage?.completion_tokens,
    };
  }, { timeoutMs: PROVIDER_STREAM_TOTAL_TIMEOUT_MS, idleTimeoutMs: PROVIDER_STREAM_IDLE_TIMEOUT_MS });
}
