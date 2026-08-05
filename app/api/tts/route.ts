import { auth } from "@/auth";
import { parseJsonBody, RequestBodyTooLargeError } from "@/lib/request-body";
import { isTrustedRequestOrigin } from "@/lib/request-security";

export const runtime = "edge";

const ELEVENLABS_ENDPOINT = "https://api.elevenlabs.io/v1/text-to-speech";
const MAX_TEXT_LENGTH = 10_000;
const PROVIDER_TIMEOUT_MS = 20_000;

type SpeechRequest = { text?: unknown; locale?: unknown };

function noStore(init?: ResponseInit) {
  return { ...init, headers: { "cache-control": "no-store", ...(init?.headers ?? {}) } };
}

function errorResponse(error: string, status: number) {
  return Response.json({ error }, noStore({ status }));
}

async function isAuthenticated() {
  try {
    return Boolean((await auth())?.user);
  } catch (error) {
    console.error("Unable to read authentication session for speech", error);
    return null;
  }
}

export async function GET() {
  const authenticated = await isAuthenticated();
  if (authenticated === null) return errorResponse("Speech service is temporarily unavailable.", 503);
  if (!authenticated) return errorResponse("Authentication required.", 401);
  return Response.json(
    { available: Boolean(process.env.ELEVENLABS_API_KEY?.trim() && process.env.ELEVENLABS_VOICE_ID?.trim()) },
    noStore(),
  );
}

export async function POST(request: Request) {
  if (!isTrustedRequestOrigin(request)) return errorResponse("Request origin is not allowed.", 403);

  const authenticated = await isAuthenticated();
  if (authenticated === null) return errorResponse("Speech service is temporarily unavailable.", 503);
  if (!authenticated) return errorResponse("Authentication required.", 401);

  let body: SpeechRequest | null;
  try {
    body = await parseJsonBody<SpeechRequest>(request, 16 * 1024);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return errorResponse("Request body is too large.", 413);
    throw error;
  }

  const speechText = typeof body?.text === "string" ? body.text.trim() : "";
  if (!speechText || speechText.length > MAX_TEXT_LENGTH) {
    return errorResponse(`Text must contain 1-${MAX_TEXT_LENGTH} characters.`, 400);
  }

  const apiKey = process.env.ELEVENLABS_API_KEY?.trim() ?? "";
  const voiceId = process.env.ELEVENLABS_VOICE_ID?.trim() ?? "";
  if (!apiKey || !voiceId) return errorResponse("High-quality speech is not configured.", 503);

  const language = body?.locale === "en" ? "en" : "ru";
  const modelId = process.env.ELEVENLABS_MODEL_ID?.trim() || "eleven_multilingual_v2";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);

  try {
    const response = await fetch(`${ELEVENLABS_ENDPOINT}/${encodeURIComponent(voiceId)}/stream?output_format=mp3_44100_128`, {
      method: "POST",
      signal: controller.signal,
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
      const providerMessage = await response.text().catch(() => "");
      console.error("ElevenLabs speech request failed", { status: response.status, message: providerMessage.slice(0, 240) });
      return errorResponse("High-quality speech is temporarily unavailable.", 502);
    }

    return new Response(response.body, {
      headers: {
        "cache-control": "no-store",
        "content-type": response.headers.get("content-type") || "audio/mpeg",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (error) {
    if (!(error instanceof DOMException && error.name === "AbortError")) {
      console.error("ElevenLabs speech request failed", error);
    }
    return errorResponse("High-quality speech is temporarily unavailable.", 502);
  } finally {
    clearTimeout(timeout);
  }
}
