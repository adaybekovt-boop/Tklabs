export type AiStreamEventName = "start" | "tool" | "delta" | "meta" | "error" | "done";

const encoder = new TextEncoder();

export function encodeAiStreamEvent(event: AiStreamEventName, payload: unknown = {}) {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`);
}

export function aiStreamHeaders(requestId: string, setCookie?: string | null) {
  const headers = new Headers({
    "cache-control": "no-cache, no-store, must-revalidate",
    "content-type": "text/event-stream; charset=utf-8",
    "x-accel-buffering": "no",
    "x-request-id": requestId,
  });
  if (setCookie) headers.set("set-cookie", setCookie);
  return headers;
}
