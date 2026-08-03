export const runtime = "edge";

const MAX_PROMPT_LENGTH = 180;
const MAX_REQUESTS_PER_DAY = 3;
const requestLog = new Map<string, { day: string; count: number }>();

function sleep(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function responseFor(prompt: string) {
  const normalized = prompt.toLowerCase();
  if (normalized.includes("honest") || normalized.includes("truth")) {
    return "The facility is fictional; the label is the product.";
  }
  if (normalized.includes("future")) {
    return "The future arrived as a dashboard, then asked for a subscription.";
  }
  return "A convincing interface is not evidence, but a clear disclosure is.";
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { prompt?: unknown } | null;
  const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";

  if (!prompt || prompt.length > MAX_PROMPT_LENGTH) {
    return Response.json({ error: `Prompt must be 1–${MAX_PROMPT_LENGTH} characters.` }, { status: 400 });
  }

  const ip = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
  const day = new Date().toISOString().slice(0, 10);
  const previous = requestLog.get(ip);
  if (previous?.day === day && previous.count >= MAX_REQUESTS_PER_DAY) {
    return Response.json({ error: "Daily demo limit reached. The imaginary finance team thanks you." }, { status: 429 });
  }
  requestLog.set(ip, { day, count: previous?.day === day ? previous.count + 1 : 1 });

  const encoder = new TextEncoder();
  const answer = responseFor(prompt);
  const startedAt = Date.now();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      for (const token of answer.split(" ")) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token: `${token} ` })}\n\n`));
        await sleep(55);
      }
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ done: true, meta: { model: "EDGE FALLBACK / NO KEY", latencyMs: Date.now() - startedAt, cost: "$0.00000" } })}\n\n`,
        ),
      );
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "cache-control": "no-cache, no-transform",
      "content-type": "text/event-stream; charset=utf-8",
      connection: "keep-alive",
    },
  });
}
