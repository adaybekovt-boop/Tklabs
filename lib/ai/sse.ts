export type AiStreamEvent =
  | { type: "start"; requestId: string; contextMessages: number; contextCharacters: number; contextTruncated: boolean }
  | { type: "delta"; text: string }
  | { type: "meta"; meta: unknown }
  | { type: "done" }
  | { type: "error"; error: string; requestId?: string; retryAfter?: number };

const encoder = new TextEncoder();

export function encodeAiStreamEvent(event: AiStreamEvent) {
  return encoder.encode(`data: ${JSON.stringify(event)}\n\n`);
}

export function splitTextForValidatedStream(value: string, chunkSize = 48) {
  const characters = Array.from(value);
  const chunks: string[] = [];
  for (let index = 0; index < characters.length; index += chunkSize) {
    chunks.push(characters.slice(index, index + chunkSize).join(""));
  }
  return chunks;
}

export async function readAiEventStream(
  body: ReadableStream<Uint8Array>,
  onEvent: (event: AiStreamEvent) => void,
) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let boundary = buffer.indexOf("\n\n");
    while (boundary >= 0) {
      const block = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      const data = block
        .split(/\r?\n/)
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart())
        .join("\n");
      if (data) {
        const parsed = JSON.parse(data) as AiStreamEvent;
        onEvent(parsed);
      }
      boundary = buffer.indexOf("\n\n");
    }
  }

  buffer += decoder.decode();
  if (buffer.trim()) {
    const data = buffer.replace(/^data:\s*/, "").trim();
    if (data) onEvent(JSON.parse(data) as AiStreamEvent);
  }
}
