import { searchTkLabKnowledge, tkLabKnowledgeVersions, type TkLabKnowledgeKind } from "@/lib/ai/knowledge/tklab";
import { MathInputError, solveMath, type MathOperation } from "@/lib/ai/math/engine";
import { executeReadOnlyTool, type RawNvidiaToolCall, type ToolExecutionContext, type ToolExecutionResult } from "@/lib/ai/tools/executor";
import { AI_TOOL_TIMEOUT_MS } from "@/lib/ai/tools/registry";
import { openWebResult, searchWeb, type WebSearchSession } from "@/lib/ai/web/gateway";

type IntelligenceToolName = "search_web" | "open_web_result" | "search_tklab_knowledge" | "solve_math";

class IntelligenceToolInputError extends Error {}

function argsObject(call: RawNvidiaToolCall) {
  const raw = call.function?.arguments;
  if (typeof raw !== "string" || raw.length > 12_000) throw new IntelligenceToolInputError("invalid_tool_arguments");
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new IntelligenceToolInputError("invalid_tool_arguments"); }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new IntelligenceToolInputError("invalid_tool_arguments");
  return parsed as Record<string, unknown>;
}

function rejectUnknown(args: Record<string, unknown>, allowed: readonly string[]) {
  if (Object.keys(args).some((key) => !allowed.includes(key))) throw new IntelligenceToolInputError("unknown_tool_argument");
}

function requiredText(value: unknown, name: string, max: number) {
  if (typeof value !== "string" || !value.trim()) throw new IntelligenceToolInputError(`${name}_required`);
  return value.trim().slice(0, max);
}

function boundedInteger(value: unknown, fallback: number, min: number, max: number) {
  if (value == null) return fallback;
  if (!Number.isInteger(value)) throw new IntelligenceToolInputError("invalid_integer");
  return Math.max(min, Math.min(max, Number(value)));
}

function knowledgeKinds(value: unknown): TkLabKnowledgeKind[] {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > 4) throw new IntelligenceToolInputError("invalid_knowledge_kinds");
  const allowed = new Set<TkLabKnowledgeKind>(["terms", "legal", "product", "release"]);
  const kinds = value.filter((entry): entry is TkLabKnowledgeKind => typeof entry === "string" && allowed.has(entry as TkLabKnowledgeKind));
  if (kinds.length !== value.length) throw new IntelligenceToolInputError("invalid_knowledge_kinds");
  return [...new Set(kinds)];
}

function mathOperation(value: unknown): MathOperation {
  const allowed = new Set<MathOperation>(["evaluate", "quadratic", "statistics", "determinant", "derivative", "integral"]);
  if (typeof value !== "string" || !allowed.has(value as MathOperation)) throw new IntelligenceToolInputError("invalid_math_operation");
  return value as MathOperation;
}

function id(call: RawNvidiaToolCall) {
  return typeof call.id === "string" && call.id.trim() ? call.id.trim().slice(0, 120) : `tool-${crypto.randomUUID()}`;
}

function isIntelligenceTool(value: unknown): value is IntelligenceToolName {
  return value === "search_web" || value === "open_web_result" || value === "search_tklab_knowledge" || value === "solve_math";
}

async function withTimeout<T>(operation: (signal: AbortSignal) => Promise<T>) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort("tool_timeout"), AI_TOOL_TIMEOUT_MS);
  try { return await operation(controller.signal); } finally { clearTimeout(timer); }
}

export async function executeIntelligenceTool(call: RawNvidiaToolCall, context: ToolExecutionContext, webSession: WebSearchSession): Promise<ToolExecutionResult> {
  const name = call.function?.name;
  if (!isIntelligenceTool(name)) return executeReadOnlyTool(call, context);

  const startedAt = Date.now();
  const toolCallId = id(call);
  try {
    const args = argsObject(call);

    if (name === "solve_math") {
      rejectUnknown(args, ["operation", "expression", "a", "b", "c", "values", "matrix"]);
      const operation = mathOperation(args.operation);
      const result = solveMath(operation, args);
      return {
        toolCallId,
        name,
        content: JSON.stringify({ ok: true, data: { ...result, trust: "deterministic_math_engine" } }).slice(0, 24_000),
        trace: {
          id: toolCallId,
          name,
          status: "success",
          durationMs: Date.now() - startedAt,
          summary: context.language === "ru" ? `Математика проверена: ${operation}` : `Math verified: ${operation}`,
        },
      };
    }

    if (name === "search_tklab_knowledge") {
      rejectUnknown(args, ["query", "kinds", "limit"]);
      const query = requiredText(args.query, "query", 300);
      const kinds = knowledgeKinds(args.kinds);
      const limit = boundedInteger(args.limit, 5, 1, 8);
      const results = searchTkLabKnowledge(context.language, query, kinds, limit);
      return {
        toolCallId,
        name,
        content: JSON.stringify({ ok: true, data: { query, kinds, versions: tkLabKnowledgeVersions(), results, trust: "tklab_source_of_truth" } }).slice(0, 28_000),
        trace: {
          id: toolCallId,
          name,
          status: "success",
          durationMs: Date.now() - startedAt,
          summary: context.language === "ru" ? `TK LAB Knowledge: ${results.length} источников` : `TK LAB Knowledge: ${results.length} sources`,
          links: results.slice(0, 5).map((entry) => ({ label: entry.title.slice(0, 80), href: entry.href })),
        },
      };
    }

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
    const timedOut = (error instanceof DOMException && error.name === "AbortError") || (error instanceof Error && error.message === "tool_timeout");
    const blocked = error instanceof IntelligenceToolInputError || error instanceof MathInputError || (error instanceof Error && /blocked|private|not_in_session|content_type|redirect/.test(error.message));
    const status = timedOut ? "timeout" : blocked ? "blocked" : "error";
    console.info("ai.intelligence_tool_call", { requestId: context.requestId, name, status, durationMs: Date.now() - startedAt, reason: error instanceof Error ? error.message.slice(0, 80) : "unknown" });
    return {
      toolCallId,
      name,
      content: JSON.stringify({ ok: false, error: timedOut ? "tool_timeout" : error instanceof Error ? error.message.slice(0, 80) : "intelligence_tool_failed" }),
      trace: {
        id: toolCallId,
        name,
        status,
        durationMs: Date.now() - startedAt,
        summary: context.language === "ru" ? "Инструмент Erma не выполнил запрос" : "Erma tool could not complete the request",
      },
    };
  }
}
