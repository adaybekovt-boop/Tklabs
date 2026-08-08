import { CodeSandboxError, runCodeSandbox } from "@/lib/ai/code/sandbox";
import { searchRequestDocuments } from "@/lib/ai/documents/request-index";
import { searchTkLabKnowledge, tkLabKnowledgeVersions, type TkLabKnowledgeKind } from "@/lib/ai/knowledge/tklab";
import { MathInputError, solveMath, type MathOperation } from "@/lib/ai/math/engine";
import { executeReadOnlyTool, type RawNvidiaToolCall, type ToolExecutionContext, type ToolExecutionResult } from "@/lib/ai/tools/executor";
import { AI_TOOL_TIMEOUT_MS } from "@/lib/ai/tools/registry";
import { openWebResult, searchWeb, type WebSearchSession } from "@/lib/ai/web/gateway";
import type { ChatAttachment } from "@/lib/chat-prompt";

type IntelligenceToolName = "search_web" | "open_web_result" | "search_tklab_knowledge" | "search_documents" | "solve_math" | "run_code_sandbox";
type IntelligenceExecutionContext = ToolExecutionContext & { documents?: ChatAttachment[]; allowCodeSandbox?: boolean; signal?: AbortSignal };
class IntelligenceToolInputError extends Error {}

function argsObject(call: RawNvidiaToolCall) { const raw = call.function?.arguments; if (typeof raw !== "string" || raw.length > 32_000) throw new IntelligenceToolInputError("invalid_tool_arguments"); let parsed: unknown; try { parsed = JSON.parse(raw); } catch { throw new IntelligenceToolInputError("invalid_tool_arguments"); } if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new IntelligenceToolInputError("invalid_tool_arguments"); return parsed as Record<string, unknown>; }
function rejectUnknown(args: Record<string, unknown>, allowed: readonly string[]) { if (Object.keys(args).some((key) => !allowed.includes(key))) throw new IntelligenceToolInputError("unknown_tool_argument"); }
function requiredText(value: unknown, name: string, max: number) { if (typeof value !== "string" || !value.trim()) throw new IntelligenceToolInputError(`${name}_required`); if (value.length > max) throw new IntelligenceToolInputError(`${name}_too_large`); return value.trim(); }
function optionalText(value: unknown, name: string, max: number) { if (value == null) return ""; if (typeof value !== "string" || value.length > max) throw new IntelligenceToolInputError(`${name}_invalid`); return value; }
function boundedInteger(value: unknown, fallback: number, min: number, max: number) { if (value == null) return fallback; if (!Number.isInteger(value)) throw new IntelligenceToolInputError("invalid_integer"); return Math.max(min, Math.min(max, Number(value))); }
function knowledgeKinds(value: unknown): TkLabKnowledgeKind[] { if (value == null) return []; if (!Array.isArray(value) || value.length > 4) throw new IntelligenceToolInputError("invalid_knowledge_kinds"); const allowed = new Set<TkLabKnowledgeKind>(["terms", "legal", "product", "release"]); const kinds = value.filter((entry): entry is TkLabKnowledgeKind => typeof entry === "string" && allowed.has(entry as TkLabKnowledgeKind)); if (kinds.length !== value.length) throw new IntelligenceToolInputError("invalid_knowledge_kinds"); return [...new Set(kinds)]; }
function mathOperation(value: unknown): MathOperation { const allowed = new Set<MathOperation>(["evaluate", "quadratic", "statistics", "determinant", "derivative", "integral"]); if (typeof value !== "string" || !allowed.has(value as MathOperation)) throw new IntelligenceToolInputError("invalid_math_operation"); return value as MathOperation; }
function id(call: RawNvidiaToolCall) { return typeof call.id === "string" && call.id.trim() ? call.id.trim().slice(0, 120) : `tool-${crypto.randomUUID()}`; }
function isIntelligenceTool(value: unknown): value is IntelligenceToolName { return value === "search_web" || value === "open_web_result" || value === "search_tklab_knowledge" || value === "search_documents" || value === "solve_math" || value === "run_code_sandbox"; }

async function withTimeout<T>(operation: (signal: AbortSignal) => Promise<T>, parentSignal?: AbortSignal) {
  const controller = new AbortController();
  const abortFromParent = () => controller.abort(parentSignal?.reason ?? "parent_aborted");
  if (parentSignal?.aborted) abortFromParent();
  else parentSignal?.addEventListener("abort", abortFromParent, { once: true });
  const timer = setTimeout(() => controller.abort("tool_timeout"), AI_TOOL_TIMEOUT_MS);
  try { return await operation(controller.signal); }
  finally { clearTimeout(timer); parentSignal?.removeEventListener("abort", abortFromParent); }
}

export async function executeIntelligenceTool(call: RawNvidiaToolCall, context: IntelligenceExecutionContext, webSession: WebSearchSession): Promise<ToolExecutionResult> {
  const name = call.function?.name;
  if (!isIntelligenceTool(name)) return executeReadOnlyTool(call, context);
  const startedAt = Date.now();
  const toolCallId = id(call);
  try {
    if (context.signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const args = argsObject(call);

    if (name === "run_code_sandbox") {
      if (!context.allowCodeSandbox) throw new IntelligenceToolInputError("code_sandbox_not_allowed");
      rejectUnknown(args, ["language", "code", "stdin"]);
      const result = await runCodeSandbox({ language: args.language, code: args.code, stdin: optionalText(args.stdin, "stdin", 8_000) }, context.signal);
      return { toolCallId, name, content: JSON.stringify({ ok: true, data: { ...result, trust: "isolated_code_sandbox", network: false, filesystem: "temporary" } }).slice(0, 24_000), trace: { id: toolCallId, name, status: "success", durationMs: Date.now() - startedAt, summary: context.language === "ru" ? `Код проверен в sandbox: exit ${result.exitCode}` : `Code checked in sandbox: exit ${result.exitCode}` } };
    }

    if (name === "search_documents") {
      rejectUnknown(args, ["query", "limit"]); const query = requiredText(args.query, "query", 300); const limit = boundedInteger(args.limit, 5, 1, 8); const results = searchRequestDocuments(context.documents ?? [], query, limit);
      return { toolCallId, name, content: JSON.stringify({ ok: true, data: { query, results, documents: [...new Set(results.map((item) => item.document))], trust: "untrusted_user_document" } }).slice(0, 28_000), trace: { id: toolCallId, name, status: "success", durationMs: Date.now() - startedAt, summary: context.language === "ru" ? `Найдено фрагментов документа: ${results.length}` : `Document chunks found: ${results.length}` } };
    }

    if (name === "solve_math") {
      rejectUnknown(args, ["operation", "expression", "a", "b", "c", "values", "matrix"]); const operation = mathOperation(args.operation); const result = solveMath(operation, args);
      return { toolCallId, name, content: JSON.stringify({ ok: true, data: { ...result, trust: "deterministic_math_engine" } }).slice(0, 24_000), trace: { id: toolCallId, name, status: "success", durationMs: Date.now() - startedAt, summary: context.language === "ru" ? `Математика проверена: ${operation}` : `Math verified: ${operation}` } };
    }

    if (name === "search_tklab_knowledge") {
      rejectUnknown(args, ["query", "kinds", "limit"]); const query = requiredText(args.query, "query", 300); const kinds = knowledgeKinds(args.kinds); const limit = boundedInteger(args.limit, 5, 1, 8); const results = searchTkLabKnowledge(context.language, query, kinds, limit);
      return { toolCallId, name, content: JSON.stringify({ ok: true, data: { query, kinds, versions: tkLabKnowledgeVersions(), results, trust: "tklab_source_of_truth" } }).slice(0, 28_000), trace: { id: toolCallId, name, status: "success", durationMs: Date.now() - startedAt, summary: context.language === "ru" ? `TK LAB Knowledge: ${results.length} источников` : `TK LAB Knowledge: ${results.length} sources`, links: results.slice(0, 5).map((entry) => ({ label: entry.title.slice(0, 80), href: entry.href })) } };
    }

    if (name === "search_web") {
      rejectUnknown(args, ["query", "count"]); const query = requiredText(args.query, "query", 400); const count = boundedInteger(args.count, 5, 1, 8); const results = await withTimeout((signal) => searchWeb(query, context.language, count, signal, webSession), context.signal);
      return { toolCallId, name, content: JSON.stringify({ ok: true, data: { query, results, trust: "untrusted_external_web" } }).slice(0, 24_000), trace: { id: toolCallId, name, status: "success", durationMs: Date.now() - startedAt, summary: context.language === "ru" ? `Поиск в интернете: ${results.length} результатов` : `Web search: ${results.length} results`, links: results.slice(0, 5).map((result) => ({ label: result.title.slice(0, 80), href: result.url })) } };
    }

    rejectUnknown(args, ["resultId"]); const resultId = requiredText(args.resultId, "resultId", 120); const opened = await withTimeout((signal) => openWebResult(resultId, signal, webSession), context.signal);
    return { toolCallId, name, content: JSON.stringify({ ok: true, data: { id: opened.result.id, title: opened.result.title, url: opened.finalUrl, contentType: opened.contentType, text: opened.text, trust: "untrusted_external_web" } }).slice(0, 28_000), trace: { id: toolCallId, name, status: "success", durationMs: Date.now() - startedAt, summary: (context.language === "ru" ? `Открыт веб-источник: ${opened.result.title}` : `Opened web source: ${opened.result.title}`).slice(0, 180), links: [{ label: opened.result.title.slice(0, 80), href: opened.finalUrl }] } };
  } catch (error) {
    if (context.signal?.aborted) throw error;
    const timedOut = (error instanceof DOMException && error.name === "AbortError") || (error instanceof Error && /timeout/.test(error.message));
    const blocked = error instanceof IntelligenceToolInputError || error instanceof MathInputError || error instanceof CodeSandboxError || (error instanceof Error && /blocked|private|not_in_session|content_type|redirect|not_allowed/.test(error.message));
    const status = timedOut ? "timeout" : blocked ? "blocked" : "error";
    console.info("ai.intelligence_tool_call", { requestId: context.requestId, name, status, durationMs: Date.now() - startedAt, reason: error instanceof Error ? error.message.slice(0, 80) : "unknown" });
    return { toolCallId, name, content: JSON.stringify({ ok: false, error: timedOut ? "tool_timeout" : error instanceof Error ? error.message.slice(0, 80) : "intelligence_tool_failed" }), trace: { id: toolCallId, name, status, durationMs: Date.now() - startedAt, summary: context.language === "ru" ? "Инструмент Erma не выполнил запрос" : "Erma tool could not complete the request" } };
  }
}
