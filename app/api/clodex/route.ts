import { auth } from "@/auth";
import { AccountAccessUnavailableError, consumeClodexAccess, releaseClodexAccess } from "@/lib/account-access";
import { AI_PRIVILEGED_SYSTEM_PROMPT, AI_SAFETY_SYSTEM_PROMPT, classifyPromptSafety, isUnsafeAssistantOutput, safetyRefusal } from "@/lib/ai-safety";
import { promptWithAttachments } from "@/lib/chat-prompt";
import { getClodexModel } from "@/lib/clodex-models";
import { PRIVILEGED_MAX_PROMPT_LENGTH, PUBLIC_MAX_PROMPT_LENGTH } from "@/lib/erma-public";
import { isPrivilegedAiEmail } from "@/lib/privileged-access";
import { parseJsonBody, RequestBodyTooLargeError } from "@/lib/request-body";
import { isTrustedRequestOrigin } from "@/lib/request-security";

export const runtime = "edge";

const CLODEX_ENDPOINT = "https://clodex.xyz/v1/messages";
const MAX_PROMPT_LENGTH = PUBLIC_MAX_PROMPT_LENGTH;
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

function errorText(language: Language, type: "prompt" | "access" | "limit" | "provider" | "configuration", promptLimit = MAX_PROMPT_LENGTH) {
  const ru = {
    prompt: `Запрос должен содержать от 1 до ${promptLimit} символов.`,
    access: "Сначала активируйте доступ к моделям в профиле.",
    limit: "Лимит Clodex исчерпан. Попробуйте снова после сброса окна.",
    provider: "Clodex не ответил. Попробуйте ещё раз.",
    configuration: "Доступ к моделям пока настраивается.",
  };
  const en = {
    prompt: `Prompt must be 1-${promptLimit} characters.`,
    access: "Activate model access in your profile first.",
    limit: "The Clodex limit is exhausted. Try again when the window resets.",
    provider: "Clodex did not respond. Please try again.",
    configuration: "Model access is being configured.",
  };
  return (language === "ru" ? ru : en)[type];
}

async function answerWithClodex(prompt: string, apiKey: string, model: string, allowCode: boolean) {
  const response = await fetchWithTimeout(CLODEX_ENDPOINT, {
    method: "POST",
    headers: { "anthropic-version": "2023-06-01", "content-type": "application/json", "x-api-key": apiKey },
    body: JSON.stringify({
      model,
      max_tokens: 256,
      system: `Answer clearly and briefly in the user's language when possible.\n\n${allowCode ? AI_PRIVILEGED_SYSTEM_PROMPT : AI_SAFETY_SYSTEM_PROMPT}`,
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
  if (!isTrustedRequestOrigin(request)) return Response.json({ error: "Request origin is not allowed." }, { status: 403, headers: { "cache-control": "no-store" } });

  let session;
  try {
    session = await auth();
  } catch (error) {
    console.error("Unable to read authentication session for Clodex", error);
    return Response.json({ error: "Authentication service is temporarily unavailable." }, { status: 503, headers: { "cache-control": "no-store" } });
  }
  const email = session?.user?.email?.trim().toLowerCase();
  if (!email) return Response.json({ error: "Authentication required." }, { status: 401 });
  const privilegedAccount = isPrivilegedAiEmail(email);

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
  const promptLimit = privilegedAccount ? PRIVILEGED_MAX_PROMPT_LENGTH : MAX_PROMPT_LENGTH;
  if (!prompt || prompt.length > promptLimit) return Response.json({ error: errorText(language, "prompt", promptLimit) }, { status: 400 });
  if (!model) return Response.json({ error: errorText(language, "access") }, { status: 403 });
  const providerPrompt = promptWithAttachments(prompt, body?.attachments);
  const safetyDecision = classifyPromptSafety(providerPrompt, { allowCode: privilegedAccount });
  if (safetyDecision.blocked) {
    return Response.json({ error: safetyRefusal(language, safetyDecision.reason) }, { status: 403, headers: { "cache-control": "no-store" } });
  }

  const apiKey = process.env.CLODEX_API_KEY?.trim();
  if (!apiKey) return Response.json({ error: errorText(language, "configuration") }, { status: 503 });

  let allowanceReserved = false;
  if (!privilegedAccount) {
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
    allowanceReserved = true;
  }

  const startedAt = Date.now();
  try {
    const providerAnswer = await answerWithClodex(providerPrompt, apiKey, model.id, privilegedAccount);
    const outputBlocked = isUnsafeAssistantOutput(providerAnswer, { allowCode: privilegedAccount });
    if (outputBlocked && allowanceReserved) {
      try {
        await releaseClodexAccess(email);
      } catch (releaseError) {
        console.error("Unable to release blocked Clodex allowance", releaseError);
      }
    }
    const answer = outputBlocked ? safetyRefusal(language) : providerAnswer;
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
    if (allowanceReserved) {
      try {
        await releaseClodexAccess(email);
      } catch (releaseError) {
        console.error("Unable to release failed Clodex allowance", releaseError);
      }
    }
    console.error("Clodex model request failed", { model: model.id, error: error instanceof Error ? error.message : String(error) });
    return Response.json({ error: errorText(language, "provider") }, { status: 502 });
  }
}
