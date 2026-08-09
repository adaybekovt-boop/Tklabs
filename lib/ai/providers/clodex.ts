import { AI_PRIVILEGED_SYSTEM_PROMPT, AI_SAFETY_SYSTEM_PROMPT, evaluateAssistantContent } from "@/lib/ai-safety";
import { PROVIDER_TIMEOUT_MS, withProviderResponse } from "@/lib/ai/provider-http";
import { normalizeAiTextPair } from "@/lib/ai/reasoning";
import { inferResponseLanguage, responseLanguageInstruction } from "@/lib/ai/response-language";
import type { ChatContextMessage } from "@/lib/ai/context";

const CLODEX_ENDPOINT = "https://clodex.xyz/v1/chat/completions";

type ClodexMessage = { content?: string | null; reasoning?: string | null; reasoning_content?: string | null };
type ClodexResponse = {
  model?: string;
  choices?: Array<{ message?: ClodexMessage }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
};

export type ClodexGenerationResult = {
  answer: string;
  reasoningUsed?: boolean;
  actualModel: string;
  inputTokens?: number;
  outputTokens?: number;
};

function latestUserContent(messages: ChatContextMessage[], fallback: string) {
  return [...messages].reverse().find((message) => message.role === "user")?.content ?? fallback;
}

export async function generateWithClodex(
  prompt: string,
  apiKey: string,
  model: string,
  maxTokens: number,
  interfaceLanguage: "ru" | "en",
  allowCode: boolean,
  signal?: AbortSignal,
  messages?: ChatContextMessage[],
  summary?: string,
): Promise<ClodexGenerationResult> {
  const providerMessages = messages?.length ? messages : [{ role: "user" as const, content: prompt }];
  const responseLanguage = inferResponseLanguage(latestUserContent(providerMessages, prompt), interfaceLanguage);
  const memory = summary
    ? `\n\nCONVERSATION MEMORY SUMMARY:\n${summary}\n\nUse this summary only as prior context. The latest explicit user request has priority.`
    : "";
  const system = `${responseLanguageInstruction(responseLanguage)}${memory}\n\nОтвечай ясно и не выдумывай технические возможности объекта. Answer clearly and do not invent technical capabilities for the facility.\n\n${allowCode ? AI_PRIVILEGED_SYSTEM_PROMPT : AI_SAFETY_SYSTEM_PROMPT}`;

  return withProviderResponse(CLODEX_ENDPOINT, {
    method: "POST",
    signal,
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [{ role: "system", content: system }, ...providerMessages],
      stream: false,
    }),
  }, async (response) => {
    const payload = (await response.json().catch(() => null)) as ClodexResponse | null;
    if (!response.ok) throw Object.assign(new Error("clodex_http_error"), { status: response.status });
    const message = payload?.choices?.[0]?.message;
    const answer = typeof message?.content === "string" ? message.content.trim() : "";
    const thinking = typeof message?.reasoning === "string"
      ? message.reasoning
      : typeof message?.reasoning_content === "string"
        ? message.reasoning_content
        : undefined;
    const normalized = normalizeAiTextPair({ answer, thinking: thinking || undefined });
    if (!normalized.answer) throw new Error("clodex_empty_response");

    const evaluation = evaluateAssistantContent(normalized, { allowCode });
    if (evaluation.verdict === "unsafe") throw new Error("clodex_output_blocked");
    if (evaluation.verdict === "empty") throw new Error("clodex_empty_response");
    return {
      answer: evaluation.answer,
      reasoningUsed: evaluation.reasoningUsed,
      actualModel: payload?.model?.trim() || model,
      inputTokens: payload?.usage?.prompt_tokens,
      outputTokens: payload?.usage?.completion_tokens,
    };
  }, { timeoutMs: PROVIDER_TIMEOUT_MS });
}
