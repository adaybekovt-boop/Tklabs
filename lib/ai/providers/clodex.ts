import { AI_PRIVILEGED_SYSTEM_PROMPT, AI_SAFETY_SYSTEM_PROMPT, isUnsafeAssistantOutput } from "@/lib/ai-safety";
import { fetchWithTimeout, withTimeout } from "@/lib/ai/provider-http";

const CLODEX_ENDPOINT = "https://clodex.xyz/v1/messages";

type ClodexResponse = { content?: Array<{ text?: string; type?: string }> | string };

export async function generateWithClodex(prompt: string, apiKey: string, model: string, language: "ru" | "en", allowCode: boolean) {
  const response = await fetchWithTimeout(CLODEX_ENDPOINT, {
    method: "POST",
    headers: { "anthropic-version": "2023-06-01", "content-type": "application/json", "x-api-key": apiKey },
    body: JSON.stringify({
      model,
      max_tokens: 256,
      system: `${language === "ru" ? "Отвечай на русском языке, ясно и кратко. Не выдумывай технические возможности объекта." : "Answer in English, clearly and briefly. Do not invent technical capabilities for the facility."}\n\n${allowCode ? AI_PRIVILEGED_SYSTEM_PROMPT : AI_SAFETY_SYSTEM_PROMPT}`,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const payload = (await withTimeout(response.json().catch(() => null))) as ClodexResponse | null;
  if (!response.ok) throw Object.assign(new Error("clodex_http_error"), { status: response.status });
  const answer = Array.isArray(payload?.content)
    ? payload.content.filter((part) => part.type === "text" || !part.type).map((part) => part.text ?? "").join("").trim()
    : typeof payload?.content === "string"
      ? payload.content.trim()
      : "";
  if (!answer) throw new Error("clodex_empty_response");
  if (isUnsafeAssistantOutput(answer, { allowCode })) throw new Error("clodex_output_blocked");
  return answer;
}
