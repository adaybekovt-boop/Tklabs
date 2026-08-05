import { auth } from "@/auth";
import { AccountAccessUnavailableError, commitTts, releaseTts, reserveTts } from "@/lib/account-access";
import { TTS_MAX_TEXT_LENGTH } from "@/lib/tts-rate-limit";
import { isPrivilegedAiEmail } from "@/lib/privileged-access";
import { parseJsonBody, RequestBodyTooLargeError } from "@/lib/request-body";
import { isTrustedRequestOrigin } from "@/lib/request-security";

export const runtime = "edge";

const ELEVENLABS_ENDPOINT = "https://api.elevenlabs.io/v1/text-to-speech";
const PROVIDER_TIMEOUT_MS = 20_000;

type SpeechRequest = { text?: unknown; locale?: unknown };
type Session = { user?: { email?: string | null } } | null;
type SessionReader = () => Promise<Session>;

function noStore(init?: ResponseInit) {
  return { ...init, headers: { "cache-control": "no-store", ...(init?.headers ?? {}) } };
}

function errorResponse(error: string, status: number, requestId?: string) {
  return Response.json({ error, ...(requestId ? { requestId } : {}) }, noStore({ status, headers: requestId ? { "x-request-id": requestId } : undefined }));
}

async function sessionEmail(readSession: SessionReader = auth) {
  try {
    return (await readSession())?.user?.email?.trim().toLowerCase() ?? "";
  } catch (error) {
    console.error("speech.auth_unavailable", { reason: error instanceof Error ? error.name : "unknown" });
    return null;
  }
}

async function releaseReservation(email: string, reservationId: string, requestId: string) {
  try {
    await releaseTts(email, reservationId);
  } catch {
    console.warn("tts.reservation_release_failed", { requestId });
  }
}

async function commitReservation(email: string, reservationId: string, requestId: string) {
  try {
    await commitTts(email, reservationId);
  } catch {
    console.warn("tts.reservation_commit_failed", { requestId });
  }
}

function proxyAudio(
  body: ReadableStream<Uint8Array>,
  options: { email: string; reservationId: string; requestId: string; signal: AbortSignal; timeout: ReturnType<typeof setTimeout> },
) {
  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  let settled = false;
  const release = async () => {
    if (settled) return;
    settled = true;
    await releaseReservation(options.email, options.reservationId, options.requestId);
  };
  const commit = async () => {
    if (settled) return;
    settled = true;
    await commitReservation(options.email, options.reservationId, options.requestId);
  };

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      reader = body.getReader();
      const pump = async () => {
        try {
          while (true) {
            const chunk = await reader!.read();
            if (chunk.done) {
              await commit();
              controller.close();
              return;
            }
            controller.enqueue(chunk.value);
          }
        } catch (error) {
          await release();
          controller.error(error);
        } finally {
          clearTimeout(options.timeout);
        }
      };
      void pump();
    },
    async cancel(reason) {
      await reader?.cancel(reason);
      await release();
      clearTimeout(options.timeout);
    },
  });

  if (options.signal.aborted) void release();
  else options.signal.addEventListener("abort", () => {
    void reader?.cancel("request_aborted");
    void release();
  }, { once: true });
  return stream;
}

export async function GET(readSession: SessionReader = auth) {
  const email = await sessionEmail(readSession);
  if (email === null) return errorResponse("Speech service is temporarily unavailable.", 503);
  if (!email) return errorResponse("Authentication required.", 401);
  return Response.json(
    { available: Boolean(process.env.ELEVENLABS_API_KEY?.trim() && process.env.ELEVENLABS_VOICE_ID?.trim()) },
    noStore(),
  );
}

export async function POST(request: Request, readSession: SessionReader = auth) {
  const requestId = crypto.randomUUID();
  if (!isTrustedRequestOrigin(request)) return errorResponse("Request origin is not allowed.", 403, requestId);

  const email = await sessionEmail(readSession);
  if (email === null) return errorResponse("Speech service is temporarily unavailable.", 503, requestId);
  if (!email) return errorResponse("Authentication required.", 401, requestId);

  let body: SpeechRequest | null;
  try {
    body = await parseJsonBody<SpeechRequest>(request, 16 * 1024);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return errorResponse("Request body is too large.", 413, requestId);
    throw error;
  }

  const speechText = typeof body?.text === "string" ? body.text.trim() : "";
  const characterCount = Array.from(speechText).length;
  if (!speechText || characterCount > TTS_MAX_TEXT_LENGTH) {
    return errorResponse(`Text must contain 1-${TTS_MAX_TEXT_LENGTH} characters.`, 400, requestId);
  }

  const apiKey = process.env.ELEVENLABS_API_KEY?.trim() ?? "";
  const voiceId = process.env.ELEVENLABS_VOICE_ID?.trim() ?? "";
  if (!apiKey || !voiceId) return errorResponse("High-quality speech is not configured.", 503, requestId);
  if (request.signal.aborted) return errorResponse("Request cancelled.", 499, requestId);

  let reservationId = "";
  try {
    const reservation = await reserveTts(email, characterCount, isPrivilegedAiEmail(email));
    if (!reservation.allowed) {
      const message = reservation.error === "parallel_request"
        ? "A speech request is already in progress."
        : reservation.error === "request_limit"
          ? "Speech request limit reached. Try again later."
          : "Daily speech character quota reached.";
      const status = reservation.error === "daily_quota" || reservation.error === "request_limit" ? 429 : 409;
      const response = errorResponse(message, status, requestId);
      if (reservation.requestResetAt) response.headers.set("retry-after", String(Math.max(1, Math.ceil((reservation.requestResetAt - Date.now()) / 1000))));
      return response;
    }
    reservationId = reservation.reservationId ?? "";
  } catch (error) {
    if (error instanceof AccountAccessUnavailableError) return errorResponse("Speech service is temporarily unavailable.", 503, requestId);
    console.error("tts.reservation_failed", { requestId });
    return errorResponse("Speech service is temporarily unavailable.", 503, requestId);
  }
  if (!reservationId) return errorResponse("Speech service is temporarily unavailable.", 503, requestId);
  if (request.signal.aborted) {
    await releaseReservation(email, reservationId, requestId);
    return errorResponse("Request cancelled.", 499, requestId);
  }

  const language = body?.locale === "en" ? "en" : "ru";
  const modelId = process.env.ELEVENLABS_MODEL_ID?.trim() || "eleven_multilingual_v2";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);
  const signal = AbortSignal.any([request.signal, controller.signal]);

  try {
    const response = await fetch(`${ELEVENLABS_ENDPOINT}/${encodeURIComponent(voiceId)}/stream?output_format=mp3_44100_128`, {
      method: "POST",
      signal,
      headers: {
        "content-type": "application/json",
        accept: "audio/mpeg",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        text: speechText,
        model_id: modelId,
        language_code: language,
        voice_settings: {
          stability: 0.48,
          similarity_boost: 0.78,
          style: 0.12,
          use_speaker_boost: true,
        },
      }),
    });

    if (!response.ok || !response.body) {
      console.error("tts.provider_failed", { requestId, status: response.status });
      await releaseReservation(email, reservationId, requestId);
      clearTimeout(timeout);
      return errorResponse("High-quality speech is temporarily unavailable.", 502, requestId);
    }

    return new Response(proxyAudio(response.body, { email, reservationId, requestId, signal: request.signal, timeout }), {
      headers: {
        "cache-control": "no-store",
        "content-type": response.headers.get("content-type") || "audio/mpeg",
        "x-content-type-options": "nosniff",
        "x-request-id": requestId,
      },
    });
  } catch (error) {
    await releaseReservation(email, reservationId, requestId);
    clearTimeout(timeout);
    if (request.signal.aborted) return errorResponse("Request cancelled.", 499, requestId);
    if (!(error instanceof DOMException && error.name === "AbortError")) console.error("tts.provider_failed", { requestId, reason: error instanceof Error ? error.name : "unknown" });
    return errorResponse("High-quality speech is temporarily unavailable.", 502, requestId);
  }
}
