import type { Update } from "grammy/types";
import { parseJsonBody, RequestBodyTooLargeError } from "../lib/request-body";
import { isAuthorized } from "./access";
import type { EnqueueResult } from "./durable-inbox";

const MAX_WEBHOOK_BODY_BYTES = 64 * 1024;

async function constantTimeEqual(left: string, right: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [leftHash, rightHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(left)),
    crypto.subtle.digest("SHA-256", encoder.encode(right)),
  ]);
  const leftBytes = new Uint8Array(leftHash);
  const rightBytes = new Uint8Array(rightHash);
  let difference = 0;
  for (let index = 0; index < leftBytes.length; index += 1) difference |= leftBytes[index] ^ rightBytes[index];
  return difference === 0;
}

export async function handleTelegramWebhook(
  request: Request,
  env: Env,
  enqueue: (update: Update) => Promise<EnqueueResult>,
): Promise<Response> {
  if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
  if (!env.TELEGRAM_BOT_TOKEN?.trim()) return Response.json({ ok: false, error: "bot_not_configured" }, { status: 503 });
  const secret = env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (!secret) return new Response("Webhook secret is not configured", { status: 503 });
  const provided = request.headers.get("X-Telegram-Bot-Api-Secret-Token") ?? "";
  if (!(await constantTimeEqual(provided, secret))) return new Response("Forbidden", { status: 403 });
  let update: Update | null;
  try {
    update = await parseJsonBody<Update>(request, MAX_WEBHOOK_BODY_BYTES);
  } catch (error) {
    return Response.json({ ok: false, error: "invalid_update" }, { status: error instanceof RequestBodyTooLargeError ? 413 : 400 });
  }
  if (!update || !Number.isSafeInteger(update.update_id) || update.update_id < 0) {
    return Response.json({ ok: false, error: "invalid_update" }, { status: 400 });
  }
  // This bot handles text messages only. Ignore unsupported/unauthorized
  // updates before they consume durable queue capacity.
  if (!("message" in update) || typeof update.message?.text !== "string" || !isAuthorized(update.message.from?.id, env)) {
    return Response.json({ ok: true });
  }
  if (!Number.isSafeInteger(update.message.chat?.id) || !Number.isSafeInteger(update.message.message_id)) {
    return Response.json({ ok: false, error: "invalid_update" }, { status: 400 });
  }
  try {
    const result = await enqueue(update);
    if (!result.accepted) return Response.json({ ok: false, error: "inbox_full" }, { status: 503, headers: { "retry-after": "5" } });
    return Response.json({ ok: true });
  } catch {
    // Telegram must retry if either persistence or its alarm could not commit.
    return Response.json({ ok: false, error: "inbox_unavailable" }, { status: 503, headers: { "retry-after": "5" } });
  }
}
