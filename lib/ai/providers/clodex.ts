import type { ProviderChatMessage } from "@/lib/ai/chat-context";
import { AI_PRIVILEGED_SYSTEM_PROMPT, AI_SAFETY_SYSTEM_PROMPT, evaluateAssistantContent } from "@/lib/ai-safety";
import { fetchWithTimeout, withTimeout } from "@/lib/ai/provider-http";
import { normalizeAiTextPair } from "@/lib/ai/reasoning";
import { inferResponseLanguage, responseLanguageInstruction } from "@/lib/ai/response-language";

const CLODEX_ENDPOINT = "https://clodex.xyz/v1/messages";

type ClodexContentBlock = { type?: string; text?: string; thinking?: string };
type ClodexResponse = { content?: ClodexContentBlock[] | string };

export type ClodexGenerationResult = { answer: string; reasoningUsed?: boolean; actualModel: string };

export async function generateWithClodex(
  prompt: string,
  apiKey: string,
  model: string,
  maxTokens: number,
  interfaceLanguage: "ru" | "en",
  allowCode: boolean,
  signal?: AbortSignal,
  history: ProviderChatMessage[] = [],
): Promise<ClodexGenerationResult> {
  const responseLanguage = inferResponseLanguage(prompt, interfaceLanguage);
  const response = await fetchWithTimeout(CLODEX_ENDPOINT, {
    method: "POST",
    signal,
    headers: { "anthropic-version": "2023-06-01", "content-type": "application/json", "x-api-key": apiKey },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system: `${responseLanguageInstruction(responseLanguage)}\n\nОтвечай ясно и не выдумывай технические возможности объекта. Answer clearly and do not invent technical capabilities for the facility.\n\n${allowCode ? AI_PRIVILEGED_SYSTEM_PROMPT : AI_SAFETY_SYSTEM_PROMPT}`,
      messages: [
        ...history.map((message) => ({ role: message.role, content: message.content })),
        { role: "user", content: prompt },
      ],
    }),
  });
  const payload = (await withTimeout(response.json().catch(() => null))) as ClodexResponse | null;
  if (!response.ok) throw Object.assign(new Error("clodex_http_error"), { status: response.status });
  const blocks = Array.isArray(payload?.content) ? payload.content : [];
  const answer = Array.isArray(payload?.content)
    ? blocks.filter((part) => part.type === "text" || !part.type).map((part) => part.text ?? "").join("").trim()
    : typeof payload?.content === "string"
      ? payload.content.trim()
      : "";
  const thinking = blocks.filter((part) => part.type === "thinking" || part.type === "redacted_thinking").map((part) => part.thinking ?? "").join("").trim();
  const normalized = normalizeAiTextPair({ answer, thinking: thinking || undefined });
  if (!normalized.answer) throw new Error("clodex_empty_response");

  const evaluation = evaluateAssistantContent(normalized, { allowCode });
  if (evaluation.verdict === "unsafe") throw new Error("clodex_output_blocked");
  if (evaluation.verdict === "empty") throw new Error("clodex_empty_response");
  return { answer: evaluation.answer, reasoningUsed: evaluation.reasoningUsed, actualModel: model };
}
