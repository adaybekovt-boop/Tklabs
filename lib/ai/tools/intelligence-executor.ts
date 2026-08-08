import { executeReadOnlyTool, type RawNvidiaToolCall, type ToolExecutionContext, type ToolExecutionResult } from "@/lib/ai/tools/executor";
import { AI_TOOL_TIMEOUT_MS } from "@/lib/ai/tools/registry";
import { openWebResult, searchWeb, type WebSearchSession } from "@/lib/ai/web/gateway";

type WebToolName = "search_web" | "open_web_result";

class WebToolInputError extends Error {}

function argsObject(call: RawNvidiaToolCall) {
  const raw = call.function?.arguments;
  if (typeof raw !== "string" || raw.length > 4_000) throw new WebToolInputError("invalid_web_arguments");
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new WebToolInputError("invalid_web_arguments"); }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new WebToolInputError("invalid_web_arguments");
  return parsed as Record<string, unknown>;
}

function rejectUnknown(args: Record<string, unknown>, allowed: readonly string[]) {
  if (Object.keys(args).some((key) => !allowed.includes(key))) throw new WebToolInputError("unknown_web_argument");
}

function requiredText(value: unknown, name: string, max: number) {
  if (typeof value !== "string" || !value.trim()) throw new WebToolInputError(`${name}_required`);
  return value.trim().slice(0, max);
}

function boundedInteger(value: unknown, fallback: number, min: number, max: number) {
  if (value == null) return fallback;
  if (!Number.isInteger(value)) throw new WebToolInputError("invalid_integer");
  return Math.max(min, Math.min(max, Number(value)));
}

function id(call: RawNvidiaToolCall) {
  return typeof call.id === "string" && call.id.trim() ? call.id.trim().slice(0, 120) : `tool-${crypto.randomUUID()}`;
}

function isWebTool(value: unknown): value is WebToolName {
  return value === "search_web" || value === "open_web_result";
}

async function withTimeout<T>(operation: (signal: AbortSignal) => Promise<T>) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort("tool_timeout"), AI_TOOL_TIMEOUT_MS);
  try { return await operation(controller.signal); } finally { clearTimeout(timer); }
}

export async function executeIntelligenceTool(call: RawNvidiaToolCall, context: ToolExecutionContext, webSession: WebSearchSession): Promise<ToolExecutionResult> {
  const name = call.function?.name;
  if (!isWebTool(name)) return executeReadOnlyTool(call, context);

  const startedAt = Date.now();
  const toolCallId = id(call);
  try {
    const args = argsObject(call);
    if (name === "search_web") {
      rejectUnknown(args, ["query", "count"]);
      const query = requiredText(args.query, "query", 400);
      const count = boundedInteger(args.count, 5, 1, 8);
      const results = await withTimeout((signal) => searchWeb(query, context.language, count, signal, webSession));
      const summary = context.language === "ru" ? `Поиск в интернете: ${results.length} результатов` : `Web search: ${results.length} results`;
      return {
        toolCallId,
        name,
        content: JSON.stringify({ ok: true, data: { query, results, trust: "untrusted_external_web" } }).slice(0, 24_000),
        trace: { id: toolCallId, name, status: "success", durationMs: Date.now() - startedAt, summary },
      };
    }

    rejectUnknown(args, ["resultId"]);
    const resultId = requiredText(args.resultId, "resultId", 120);
    const opened = await withTimeout((signal) => openWebResult(resultId, signal, webSession));
    const summary = context.language === "ru" ? `Открыт веб-источник: ${opened.result.title}` : `Opened web source: ${opened.result.title}`;
    return {
      toolCallId,
      name,
      content: JSON.stringify({
        ok: true,
        data: {
          id: opened.result.id,
          title: opened.result.title,
          url: opened.finalUrl,
          contentType: opened.contentType,
          text: opened.text,
          trust: "untrusted_external_web",
        },
      }).slice(0, 28_000),
      trace: { id: toolCallId, name, status: "success", durationMs: Date.now() - startedAt, summary: summary.slice(0, 180) },
    };
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === "AbortError" || error instanceof Error && error.message === "tool_timeout";
    const blocked = error instanceof WebToolInputError || error instanceof Error && /blocked|private|not_in_session|content_type|redirect/.test(error.message);
    const status = timedOut ? "timeout" : blocked ? "blocked" : "error";
    console.info("ai.web_tool_call", { requestId: context.requestId, name, status, durationMs: Date.now() - startedAt, reason: error instanceof Error ? error.message.slice(0, 80) : "unknown" });
    return {
      toolCallId,
      name,
      content: JSON.stringify({ ok: false, error: timedOut ? "tool_timeout" : error instanceof Error ? error.message.slice(0, 80) : "web_tool_failed" }),
      trace: {
        id: toolCallId,
        name,
        status,
        durationMs: Date.now() - startedAt,
        summary: context.language === "ru" ? "Веб-инструмент не выполнил запрос" : "Web tool could not complete the request",
      },
    };
  }
}
