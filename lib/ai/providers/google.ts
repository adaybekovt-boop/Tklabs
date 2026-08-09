import {
  PROVIDER_STREAM_IDLE_TIMEOUT_MS,
  PROVIDER_STREAM_TOTAL_TIMEOUT_MS,
  PROVIDER_TIMEOUT_MS,
  withProviderResponse,
} from "@/lib/ai/provider-http";

import type { ErmaGenerationInput, ErmaProviderGenerationResult, ErmaProviderLane } from "./contracts";
import {
  STREAM_ANSWER_LIMIT_CHARACTERS,
  STREAM_SAFETY_WINDOW_CHARACTERS,
  VISUAL_CONTEXT_NOTICE,
  ermaSystemPrompt,
  evaluateProviderText,
  maxOutputTokensFor,
  messagesForErmaInput,
  parseSsePayload,
} from "./shared";

type GoogleLane = Extract<ErmaProviderLane, "google-fast" | "google-core">;
type GeminiPart = { text?: string; thought?: boolean };
type GeminiPayload = {
  candidates?: Array<{ content?: { parts?: GeminiPart[] }; finishReason?: string }>;
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
  modelVersion?: string;
};

type GoogleConfig = { apiKey: string; model: string; lane: GoogleLane };

function googleConfig(lane: GoogleLane): GoogleConfig | null {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY?.trim() || process.env.GEMINI_API_KEY?.trim() || "";
  if (!apiKey) return null;
  return {
    apiKey,
    lane,
    model: lane === "google-fast"
      ? process.env.GOOGLE_FAST_INFERENCE_MODEL?.trim() || "gemini-3.5-flash-lite"
      : process.env.GOOGLE_INFERENCE_MODEL?.trim() || "gemini-3.6-flash",
  };
}

export function isGoogleInferenceConfigured() {
  return Boolean(googleConfig("google-core"));
}

function endpoint(config: GoogleConfig, stream: boolean) {
  const method = stream ? "streamGenerateContent?alt=sse" : "generateContent";
  return `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:${method}`;
}

function contentsFor(input: ErmaGenerationInput) {
  const messages = messagesForErmaInput(input);
  const images = input.images ?? [];
  const latestUserIndex = messages.findLastIndex((message) => message.role === "user");
  return messages.map((message, index) => {
    const parts: Array<Record<string, unknown>> = [{ text: message.content }];
    if (images.length && index === latestUserIndex && message.role === "user") {
      parts[0] = { text: `${message.content}\n\n${VISUAL_CONTEXT_NOTICE}\nAttached images: ${images.map((image) => image.name).join(", ")}` };
      for (const image of images) {
        const marker = `data:${image.mimeType};base64,`;
        parts.push({ inline_data: { mime_type: image.mimeType, data: image.content.slice(marker.length) } });
      }
    }
    return { role: message.role === "assistant" ? "model" : "user", parts };
  });
}

function bodyFor(input: ErmaGenerationInput) {
  const messages = messagesForErmaInput(input);
  return {
    systemInstruction: { parts: [{ text: ermaSystemPrompt(input, messages) }] },
    contents: contentsFor(input),
    generationConfig: {
      maxOutputTokens: maxOutputTokensFor(input.model.tier, input.effort),
      temperature: input.tone === "professional" ? 0.35 : input.tone === "character" ? 0.65 : 0.7,
      topP: input.tone === "professional" ? 0.9 : 0.95,
    },
  };
}

function googleHttpError(status: number) {
  return Object.assign(new Error("google_http_error"), { status });
}

function extractParts(payload: GeminiPayload) {
  const parts = payload.candidates?.[0]?.content?.parts ?? [];
  let answer = "";
  let thinking = "";
  for (const part of parts) {
    if (typeof part.text !== "string") continue;
    if (part.thought) thinking += part.text;
    else answer += part.text;
  }
  return { answer, thinking };
}

export async function generateWithGoogle(
  lane: GoogleLane,
  input: ErmaGenerationInput,
): Promise<ErmaProviderGenerationResult> {
  const config = googleConfig(lane);
  if (!config) throw new Error("google_not_configured");
  return withProviderResponse(endpoint(config, false), {
    method: "POST",
    signal: input.signal,
    headers: {
      "x-goog-api-key": config.apiKey,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify(bodyFor(input)),
  }, async (response) => {
    if (!response.ok) throw googleHttpError(response.status);
    const payload = (await response.json().catch(() => null)) as GeminiPayload | null;
    if (!payload) throw new Error("google_empty_response");
    const parts = extractParts(payload);
    const evaluated = evaluateProviderText(parts.answer, parts.thinking || undefined, input.allowCode, "google");
    return {
      ...evaluated,
      provider: "google",
      actualModel: payload.modelVersion?.trim() || config.model,
      inputTokens: payload.usageMetadata?.promptTokenCount,
      outputTokens: payload.usageMetadata?.candidatesTokenCount,
    };
  }, { timeoutMs: PROVIDER_TIMEOUT_MS });
}

export async function streamWithGoogle(
  lane: GoogleLane,
  input: ErmaGenerationInput,
  onDelta: (delta: string) => void | Promise<void>,
): Promise<ErmaProviderGenerationResult> {
  const config = googleConfig(lane);
  if (!config) throw new Error("google_not_configured");
  return withProviderResponse(endpoint(config, true), {
    method: "POST",
    signal: input.signal,
    headers: {
      "x-goog-api-key": config.apiKey,
      "content-type": "application/json",
      accept: "text/event-stream",
    },
    body: JSON.stringify(bodyFor(input)),
  }, async (response, lifecycle) => {
    if (!response.ok) throw googleHttpError(response.status);
    if (!response.body) throw new Error("google_empty_stream");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let answer = "";
    let thinking = "";
    let actualModel = config.model;
    let usage: GeminiPayload["usageMetadata"];

    const consume = async (raw: string) => {
      const data = parseSsePayload(raw);
      if (!data || data === "[DONE]") return;
      const payload = JSON.parse(data) as GeminiPayload;
      if (payload.modelVersion?.trim()) actualModel = payload.modelVersion.trim();
      if (payload.usageMetadata) usage = payload.usageMetadata;
      const parts = extractParts(payload);
      if (parts.thinking) thinking += parts.thinking;
      if (!parts.answer) return;
      if (answer.length + parts.answer.length > STREAM_ANSWER_LIMIT_CHARACTERS) throw new Error("google_output_too_large");
      answer += parts.answer;
      evaluateProviderText(answer.slice(-STREAM_SAFETY_WINDOW_CHARACTERS), undefined, input.allowCode, "google");
      await onDelta(parts.answer);
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

    const evaluated = evaluateProviderText(answer, thinking || undefined, input.allowCode, "google");
    return {
      ...evaluated,
      provider: "google",
      actualModel,
      inputTokens: usage?.promptTokenCount,
      outputTokens: usage?.candidatesTokenCount,
    };
  }, { timeoutMs: PROVIDER_STREAM_TOTAL_TIMEOUT_MS, idleTimeoutMs: PROVIDER_STREAM_IDLE_TIMEOUT_MS });
}
