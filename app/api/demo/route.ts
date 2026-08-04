import { DemoRateLimitUnavailableError, consumeDemoRequest } from "@/lib/demo-rate-limit-access";
import { promptWithAttachments } from "@/lib/chat-prompt";
import { getErmaModel, getErmaSystemPrompt, type ErmaModel } from "@/lib/models";
import { parseJsonBody, RequestBodyTooLargeError } from "@/lib/request-body";

export const runtime = "edge";

const MAX_PROMPT_LENGTH = 180;
const NVIDIA_ENDPOINT = "https://integrate.api.nvidia.com/v1/chat/completions";
const NVIDIA_KEY_COOLDOWN_MS = 15 * 60 * 1000;
const PROVIDER_TIMEOUT_MS = 30 * 1000;
const CLODEX_ENDPOINT = "https://clodex.xyz/v1/messages";
const CLODEX_MODEL = "claude-clodex-5";

type Language = "ru" | "en";
type Provider = "nvidia" | "clodex" | "edge-fallback";
type ProviderResult = { answer: string; provider: Provider; model: string; providerModel?: string };
type ClodexResponse = { content?: Array<{ text?: string; type?: string }> | string };
type ChatRequest = { prompt?: unknown; locale?: unknown; model?: unknown; reason?: unknown; effort?: unknown; attachments?: unknown };
type NvidiaChunk = { choices?: Array<{ delta?: { content?: string | null } }> };
type ReasoningEffort = "low" | "medium" | "high";

class NvidiaKeyRotationError extends Error {
  readonly cooldownMs: number;

  constructor(message: string, cooldownMs = NVIDIA_KEY_COOLDOWN_MS) {
    super(message);
    this.name = "NvidiaKeyRotationError";
    this.cooldownMs = cooldownMs;
  }
}

function sleep(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Provider request timed out")), timeoutMs);
    promise.then(resolve, reject).finally(() => clearTimeout(timeout));
  });
}

function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit, timeoutMs = PROVIDER_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timeout));
}

function normalizeEffort(value: unknown): ReasoningEffort {
  return value === "low" || value === "high" ? value : "medium";
}

function responseFor(prompt: string, language: Language) {
  const normalized = prompt.toLowerCase();
  if (language === "ru") {
    if (normalized.includes("чест") || normalized.includes("правд") || normalized.includes("truth")) return "Объект вымышленный; честная маркировка — настоящий продукт.";
    if (normalized.includes("будущ") || normalized.includes("future")) return "Будущее пришло в виде панели, а потом попросило оформить подписку.";
    return "Убедительный интерфейс не является доказательством, а ясное раскрытие — является.";
  }
  if (normalized.includes("honest") || normalized.includes("truth")) return "The facility is fictional; the label is the product.";
  if (normalized.includes("future")) return "The future arrived as a dashboard, then asked for a subscription.";
  return "A convincing interface is not evidence, but a clear disclosure is.";
}

let preferredNvidiaKeyIndex = 0;
const nvidiaKeyCooldowns = new Map<string, number>();

function getNvidiaApiKeys() {
  const primary = process.env.NVIDIA_API_KEY_PRIMARY?.trim() || process.env.NVIDIA_API_KEY_1?.trim() || process.env.NVIDIA_API_KEY?.trim() || "";
  const secondary = process.env.NVIDIA_API_KEY_SECONDARY?.trim() || process.env.NVIDIA_API_KEY_2?.trim() || "";
  return [primary, secondary].filter((key, index, keys): key is string => Boolean(key) && keys.indexOf(key) === index);
}

function getAvailableNvidiaKeyIndexes(keys: string[]) {
  if (!keys.length) return [];
  const start = preferredNvidiaKeyIndex % keys.length;
  return keys.map((_, offset) => (start + offset) % keys.length).filter((index) => (nvidiaKeyCooldowns.get(keys[index]) ?? 0) <= Date.now());
}

function markNvidiaKeyUnavailable(key: string, cooldownMs: number) {
  nvidiaKeyCooldowns.set(key, Date.now() + Math.max(cooldownMs, 60_000));
}

function getClodexApiKey() {
  return process.env.CLODEX_API_KEY?.trim() ?? "";
}

async function answerWithClodex(prompt: string, apiKey: string, language: Language): Promise<ProviderResult> {
  const response = await fetchWithTimeout(CLODEX_ENDPOINT, {
    method: "POST",
    headers: { "anthropic-version": "2023-06-01", "content-type": "application/json", "x-api-key": apiKey },
    body: JSON.stringify({
      model: CLODEX_MODEL,
      max_tokens: 256,
      system: language === "ru" ? "Отвечай на русском языке, ясно и кратко. Не выдумывай технические возможности объекта." : "Answer in English, clearly and briefly. Do not invent technical capabilities for the facility.",
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const payload = (await withTimeout(response.json().catch(() => null), PROVIDER_TIMEOUT_MS)) as ClodexResponse | null;
  if (!response.ok) throw new Error(`Clodex returned HTTP ${response.status}`);
  const answer = Array.isArray(payload?.content) ? payload.content.filter((part) => part.type === "text" || !part.type).map((part) => part.text ?? "").join("").trim() : typeof payload?.content === "string" ? payload.content.trim() : "";
  if (!answer) throw new Error("Clodex returned an empty response");
  return { answer, model: CLODEX_MODEL, provider: "clodex" };
}

function nvidiaSystemPrompt(language: Language, model: ErmaModel) {
  const persona = getErmaSystemPrompt(model);
  const languageNote =
    language === "ru"
      ? "Отвечай на русском языке."
      : "Reply in English, but keep the persona's Russian catchphrases and quirks untranslated.";
  return `${persona}\n\n${languageNote}`;
}

function maxTokensFor(model: ErmaModel) {
  if (model.tier === "heavy") return 8192;
  if (model.tier === "medium") return 4096;
  return 2048;
}

function reasoningBudgetFor(model: ErmaModel, effort: ReasoningEffort) {
  const maxBudget = model.tier === "heavy" ? 8192 : model.tier === "medium" ? 4096 : 2048;
  if (effort === "low") return Math.min(1024, maxBudget);
  if (effort === "high") return maxBudget;
  return Math.min(2048, maxBudget);
}

function buildNvidiaBody(prompt: string, language: Language, model: ErmaModel, requestedReasoning: boolean, effort: ReasoningEffort) {
  const reasoningEnabled = model.reasoning || requestedReasoning || effort === "high";
  const body: Record<string, unknown> = {
    model: model.nvidiaModel,
    messages: [
      { role: "system", content: nvidiaSystemPrompt(language, model) },
      { role: "user", content: prompt },
    ],
    temperature: reasoningEnabled ? 0.6 : 0.7,
    top_p: 0.95,
    max_tokens: maxTokensFor(model),
    stream: true,
  };

  if (reasoningEnabled && model.nvidiaModel?.startsWith("nvidia/nemotron")) {
    body.chat_template_kwargs = { enable_thinking: true };
    body.reasoning_budget = reasoningBudgetFor(model, effort);
  }

  return body;
}

async function fetchNvidiaBody(prompt: string, language: Language, model: ErmaModel, apiKey: string, requestedReasoning: boolean, effort: ReasoningEffort) {
  const response = await fetchWithTimeout(NVIDIA_ENDPOINT, {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json", accept: "text/event-stream" },
    body: JSON.stringify(buildNvidiaBody(prompt, language, model, requestedReasoning, effort)),
  });
  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    const shouldRotate = [401, 402, 403, 429].includes(response.status) || /quota|rate[ -]?limit|too many|credit|limit exceeded|exhausted|throttl/i.test(errorText);
    if (shouldRotate) throw new NvidiaKeyRotationError(`NVIDIA key rejected with HTTP ${response.status}`);
    throw new Error(`NVIDIA returned HTTP ${response.status}`);
  }
  if (!response.body) throw new Error("NVIDIA returned an empty stream");
  return response.body;
}

async function fetchNvidiaWithKeyRotation(prompt: string, language: Language, model: ErmaModel, requestedReasoning: boolean, effort: ReasoningEffort) {
  const keys = getNvidiaApiKeys();
  const candidateIndexes = getAvailableNvidiaKeyIndexes(keys);
  if (!candidateIndexes.length) throw new Error("No NVIDIA API key is available");

  let lastRotationError: NvidiaKeyRotationError | undefined;
  for (const keyIndex of candidateIndexes) {
    const apiKey = keys[keyIndex];
    try {
      const body = await fetchNvidiaBody(prompt, language, model, apiKey, requestedReasoning, effort);
      preferredNvidiaKeyIndex = keyIndex;
      return body;
    } catch (error) {
      if (!(error instanceof NvidiaKeyRotationError)) throw error;
      lastRotationError = error;
      markNvidiaKeyUnavailable(apiKey, error.cooldownMs);
    }
  }

  throw lastRotationError ?? new Error("NVIDIA API keys are unavailable");
}

async function resolveFallback(prompt: string, language: Language, model: ErmaModel): Promise<ProviderResult> {
  const clodexApiKey = getClodexApiKey();
  if (clodexApiKey) {
    try {
      const result = await answerWithClodex(prompt, clodexApiKey, language);
      return { ...result, model: model.name, providerModel: result.model };
    } catch {
      // The deterministic answer keeps the demo usable when an optional provider is unavailable.
    }
  }

  return {
    answer: responseFor(prompt, language),
    model: model.name,
    provider: "edge-fallback",
    providerModel: language === "ru" ? "локальный резерв" : "local fallback",
  };
}

type ResponseMeta = { model: string; provider: Provider; providerModel?: string; latencyMs: number; cost: string };

function metaFor(result: ProviderResult, startedAt: number): ResponseMeta {
  return {
    model: result.model,
    provider: result.provider,
    ...(result.providerModel ? { providerModel: result.providerModel } : {}),
    latencyMs: Date.now() - startedAt,
    cost: result.provider === "edge-fallback" ? "$0.00000" : "provider billed",
  };
}

function pushEvent(controller: ReadableStreamDefaultController<Uint8Array>, encoder: TextEncoder, payload: unknown) {
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
}

async function emitTextAnswer(controller: ReadableStreamDefaultController<Uint8Array>, encoder: TextEncoder, result: ProviderResult, startedAt: number) {
  for (const [index, token] of result.answer.split(" ").entries()) {
    pushEvent(controller, encoder, { token: `${index ? " " : ""}${token}` });
    await sleep(result.provider === "clodex" ? 18 : 55);
  }
  pushEvent(controller, encoder, { done: true, meta: metaFor(result, startedAt) });
}

async function emitNvidiaStream(
  body: ReadableStream<Uint8Array>,
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
  prompt: string,
  language: Language,
  model: ErmaModel,
  startedAt: number,
) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let emittedText = false;

  const handleLine = (line: string) => {
    if (!line.startsWith("data:")) return;
    const data = line.slice(5).trim();
    if (!data || data === "[DONE]") return;
    let payload: NvidiaChunk;
    try {
      payload = JSON.parse(data) as NvidiaChunk;
    } catch {
      return;
    }
    const token = payload.choices?.[0]?.delta?.content;
    if (typeof token === "string" && token) {
      emittedText = true;
      pushEvent(controller, encoder, { token });
    }
  };

  try {
    while (true) {
      const { done, value } = await withTimeout(reader.read(), PROVIDER_TIMEOUT_MS);
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? "";
      for (const line of lines) handleLine(line);
    }
    buffer += decoder.decode();
    if (buffer) handleLine(buffer);
    if (!emittedText) throw new Error("NVIDIA returned no visible content");
    pushEvent(controller, encoder, {
      done: true,
      meta: metaFor({ answer: "", provider: "nvidia", model: model.name, providerModel: model.nvidiaModel ?? undefined }, startedAt),
    });
  } catch {
    if (emittedText) {
      pushEvent(controller, encoder, {
        done: true,
        meta: metaFor({ answer: "", provider: "nvidia", model: model.name, providerModel: model.nvidiaModel ?? undefined }, startedAt),
      });
      return;
    }
    const fallback = await resolveFallback(prompt, language, model);
    await emitTextAnswer(controller, encoder, fallback, startedAt);
  }
}

function eventStream(stream: ReadableStream<Uint8Array>) {
  return new Response(stream, {
    headers: {
      "cache-control": "no-cache, no-transform",
      "content-type": "text/event-stream; charset=utf-8",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}

export async function POST(request: Request) {
  let body: ChatRequest | null;
  try {
    body = await parseJsonBody<ChatRequest>(request);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return Response.json({ error: "Request body is too large." }, { status: 413 });
    throw error;
  }
  const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
  const language: Language = body?.locale === "en" ? "en" : "ru";
  const model = getErmaModel(typeof body?.model === "string" ? body.model : undefined);
  const requestedReasoning = body?.reason === true;
  const effort = normalizeEffort(body?.effort);
  const providerPrompt = promptWithAttachments(prompt, body?.attachments);

  if (!prompt || prompt.length > MAX_PROMPT_LENGTH) return Response.json({ error: language === "ru" ? `Запрос должен содержать от 1 до ${MAX_PROMPT_LENGTH} символов.` : `Prompt must be 1-${MAX_PROMPT_LENGTH} characters.` }, { status: 400 });

  const clientIdentifier = request.headers.get("cf-connecting-ip")?.trim() || "anonymous";
  let allowance;
  try {
    allowance = await consumeDemoRequest(clientIdentifier);
  } catch (error) {
    if (!(error instanceof DemoRateLimitUnavailableError)) console.error("Unable to consume demo allowance", error);
    return Response.json({ error: language === "ru" ? "Демо временно недоступно. Попробуйте позже." : "The demo is temporarily unavailable. Please try again later." }, { status: 503 });
  }
  if (!allowance.allowed) {
    const retryAfter = allowance.resetAt ? Math.max(1, Math.ceil((allowance.resetAt - Date.now()) / 1000)) : undefined;
    return Response.json(
      { error: language === "ru" ? "Дневной лимит демо исчерпан. Попробуйте завтра." : "Daily demo limit reached. Please try again tomorrow.", retryAt: allowance.resetAt },
      {
        status: 429,
        headers: {
          "cache-control": "no-store",
          ...(retryAfter ? { "retry-after": String(retryAfter) } : {}),
        },
      },
    );
  }

  const startedAt = Date.now();
  const encoder = new TextEncoder();
  if (getNvidiaApiKeys().length && model.nvidiaModel) {
    try {
      const upstreamBody = await fetchNvidiaWithKeyRotation(providerPrompt, language, model, requestedReasoning, effort);
      const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
          await emitNvidiaStream(upstreamBody, controller, encoder, providerPrompt, language, model, startedAt);
          controller.close();
        },
      });
      return eventStream(stream);
    } catch {
      // NVIDIA is the primary route; the existing provider/fallback keeps the public preview resilient.
    }
  }

  const result = await resolveFallback(providerPrompt, language, model);
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      await emitTextAnswer(controller, encoder, result, startedAt);
      controller.close();
    },
  });
  return eventStream(stream);
}
