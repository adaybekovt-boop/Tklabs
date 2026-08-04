import { auth } from "@/auth";
import { AccountAccessUnavailableError, consumeClodexAccess, releaseClodexAccess } from "@/lib/account-access";
import { promptWithAttachments } from "@/lib/chat-prompt";
import { getClodexModel } from "@/lib/clodex-models";
import { parseJsonBody, RequestBodyTooLargeError } from "@/lib/request-body";

export const runtime = "edge";

const CLODEX_ENDPOINT = "https://clodex.xyz/v1/messages";
const MAX_PROMPT_LENGTH = 180;
const PROVIDER_TIMEOUT_MS = 30 * 1000;

type Language = "ru" | "en";
type ClodexResponse = { content?: Array<{ text?: string; type?: string }> | string };
type ChatRequest = { prompt?: unknown; locale?: unknown; model?: unknown; attachments?: unknown };

function streamResponse(stream: ReadableStream<Uint8Array>) {
  return new Response(stream, {
    headers: {
      "cache-control": "no-cache, no-transform",
      "content-type": "text/event-stream; charset=utf-8",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}

function event(controller: ReadableStreamDefaultController<Uint8Array>, encoder: TextEncoder, payload: unknown) {
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
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

function errorText(language: Language, type: "prompt" | "access" | "limit" | "provider" | "configuration") {
  const ru = {
    prompt: `Запрос должен содержать от 1 до ${MAX_PROMPT_LENGTH} символов.`,
    access: "Сначала активируйте доступ к моделям в профиле.",
    limit: "Лимит Clodex исчерпан. Попробуйте снова после сброса окна.",
    provider: "Clodex не ответил. Попробуйте ещё раз.",
    configuration: "Доступ к моделям пока настраивается.",
  };
  const en = {
    prompt: `Prompt must be 1-${MAX_PROMPT_LENGTH} characters.`,
    access: "Activate model access in your profile first.",
    limit: "The Clodex limit is exhausted. Try again when the window resets.",
    provider: "Clodex did not respond. Please try again.",
    configuration: "Model access is being configured.",
  };
  return (language === "ru" ? ru : en)[type];
}

async function answerWithClodex(prompt: string, apiKey: string, model: string) {
  const response = await fetchWithTimeout(CLODEX_ENDPOINT, {
    method: "POST",
    headers: { "anthropic-version": "2023-06-01", "content-type": "application/json", "x-api-key": apiKey },
    body: JSON.stringify({
      model,
      max_tokens: 256,
      system: "Answer clearly and briefly in the user's language when possible.",
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const payload = (await withTimeout(response.json().catch(() => null), PROVIDER_TIMEOUT_MS)) as ClodexResponse | null;
  if (!response.ok) throw new Error(`Clodex returned HTTP ${response.status}`);
  const answer = Array.isArray(payload?.content)
    ? payload.content.filter((part) => part.type === "text" || !part.type).map((part) => part.text ?? "").join("").trim()
    : typeof payload?.content === "string"
      ? payload.content.trim()
      : "";
  if (!answer) throw new Error("Clodex returned an empty response");
  return answer;
}

export async function POST(request: Request) {
  const session = await auth();
  const email = session?.user?.email?.trim().toLowerCase();
  if (!email) return Response.json({ error: "Authentication required." }, { status: 401 });

  let body: ChatRequest | null;
  try {
    body = await parseJsonBody<ChatRequest>(request);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return Response.json({ error: "Request body is too large." }, { status: 413 });
    throw error;
  }
  const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
  const language: Language = body?.locale === "en" ? "en" : "ru";
  const model = getClodexModel(typeof body?.model === "string" ? body.model : undefined);
  if (!prompt || prompt.length > MAX_PROMPT_LENGTH) return Response.json({ error: errorText(language, "prompt") }, { status: 400 });
  if (!model) return Response.json({ error: errorText(language, "access") }, { status: 403 });

  const apiKey = process.env.CLODEX_API_KEY?.trim();
  if (!apiKey) return Response.json({ error: errorText(language, "configuration") }, { status: 503 });

  let allowance;
  try {
    allowance = await consumeClodexAccess(email);
  } catch (error) {
    if (error instanceof AccountAccessUnavailableError) return Response.json({ error: errorText(language, "configuration") }, { status: 503 });
    console.error("Unable to consume Clodex allowance", error);
    return Response.json({ error: errorText(language, "configuration") }, { status: 503 });
  }

  if (!allowance.allowed) {
    const status = allowance.error === "limit_reached" ? 429 : 403;
    const retryAfter = allowance.retryAt ? Math.max(1, Math.ceil((allowance.retryAt - Date.now()) / 1000)) : undefined;
    return Response.json(
      { error: errorText(language, allowance.error === "limit_reached" ? "limit" : "access"), retryAt: allowance.retryAt },
      {
        status,
        headers: {
          "cache-control": "no-store",
          ...(retryAfter ? { "retry-after": String(retryAfter) } : {}),
        },
      },
    );
  }

  const startedAt = Date.now();
  const providerPrompt = promptWithAttachments(prompt, body?.attachments);
  try {
    const answer = await answerWithClodex(providerPrompt, apiKey, model.id);
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const [index, token] of answer.split(" ").entries()) event(controller, encoder, { token: `${index ? " " : ""}${token}` });
        event(controller, encoder, {
          done: true,
          meta: { model: model.id, provider: "clodex", providerModel: model.id, latencyMs: Date.now() - startedAt, cost: "provider billed" },
        });
        controller.close();
      },
    });
    return streamResponse(stream);
  } catch (error) {
    try {
      await releaseClodexAccess(email);
    } catch (releaseError) {
      console.error("Unable to release failed Clodex allowance", releaseError);
    }
    console.error("Clodex model request failed", { model: model.id, error: error instanceof Error ? error.message : String(error) });
    return Response.json({ error: errorText(language, "provider") }, { status: 502 });
  }
}
