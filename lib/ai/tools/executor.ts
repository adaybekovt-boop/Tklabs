import { DOCUMENTATION_INDEX } from "@/lib/ai/tools/documentation-index";
import { AI_TOOL_TIMEOUT_MS, isAllowedAiToolName } from "@/lib/ai/tools/registry";
import type { AiToolCallLink, AiToolCallTrace, AiToolName } from "@/lib/ai/types";
import { getReleaseHistory } from "@/lib/latest-release";
import { getErmaCapabilities } from "@/lib/models/capabilities";
import { ERMA_MODELS } from "@/lib/models/server";
import type { HealthPayload } from "@/lib/provider-health";

type Language = "ru" | "en";

export type LocalArchiveSearchEntry = {
  id: string;
  title: string;
  project?: string;
  updatedAt: number;
  excerpt: string;
};

export type RawNvidiaToolCall = {
  id?: unknown;
  type?: unknown;
  function?: {
    name?: unknown;
    arguments?: unknown;
  };
};

export type ToolExecutionContext = {
  language: Language;
  requestId: string;
  localArchive: LocalArchiveSearchEntry[];
  getServiceStatus: (signal: AbortSignal) => Promise<HealthPayload>;
};

export type ToolExecutionResult = {
  toolCallId: string;
  name: AiToolName;
  content: string;
  trace: AiToolCallTrace;
};

class ToolInputError extends Error {}

function text(value: unknown, name: string, maxLength: number, required = true) {
  if (value == null && !required) return "";
  if (typeof value !== "string") throw new ToolInputError(`${name}_must_be_string`);
  const normalized = value.trim();
  if (required && !normalized) throw new ToolInputError(`${name}_required`);
  if (Array.from(normalized).length > maxLength) throw new ToolInputError(`${name}_too_long`);
  return normalized;
}

function limit(value: unknown, fallback: number) {
  if (value == null) return fallback;
  if (!Number.isInteger(value) || Number(value) < 1 || Number(value) > 5) throw new ToolInputError("invalid_limit");
  return Number(value);
}

function objectArgs(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ToolInputError("arguments_must_be_object");
  return value as Record<string, unknown>;
}

function rejectUnknownKeys(args: Record<string, unknown>, allowed: readonly string[]) {
  if (Object.keys(args).some((key) => !allowed.includes(key))) throw new ToolInputError("unknown_argument");
}

function parseArguments(value: unknown) {
  if (typeof value !== "string") throw new ToolInputError("arguments_must_be_json_string");
  if (value.length > 2_000) throw new ToolInputError("arguments_too_large");
  try {
    return objectArgs(JSON.parse(value));
  } catch (error) {
    if (error instanceof ToolInputError) throw error;
    throw new ToolInputError("invalid_json_arguments");
  }
}

function normalizeVersion(value: string) {
  const normalized = value.trim().toLowerCase();
  return normalized.startsWith("v") ? normalized : `v${normalized}`;
}

function safeLinks(links: AiToolCallLink[]) {
  return links.filter((link) => link.href.startsWith("/") && !link.href.startsWith("//")).slice(0, 5);
}

function searchable(value: string) {
  return value.toLocaleLowerCase().replace(/\s+/g, " ").trim();
}

function scoreText(haystack: string, query: string) {
  if (!query) return 1;
  const normalized = searchable(haystack);
  const terms = searchable(query).split(" ").filter(Boolean);
  if (!terms.length) return 1;
  return terms.reduce((score, term) => score + (normalized.includes(term) ? 2 : 0), 0);
}

function searchDocumentation(args: Record<string, unknown>, language: Language) {
  rejectUnknownKeys(args, ["query", "limit"]);
  const query = text(args.query, "query", 160);
  const max = limit(args.limit, 3);
  const results = DOCUMENTATION_INDEX
    .map((entry) => ({ entry, score: scoreText(`${entry.id} ${entry.title.ru} ${entry.title.en} ${entry.summary.ru} ${entry.summary.en} ${entry.keywords.join(" ")}`, query) }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, max)
    .map(({ entry }) => ({ title: entry.title[language], summary: entry.summary[language], href: entry.href }));
  return {
    result: { query, results },
    summary: language === "ru" ? `Найдено разделов документации: ${results.length}` : `Documentation sections found: ${results.length}`,
    links: results.map((entry) => ({ label: entry.title, href: entry.href })),
  };
}

function searchPatchNotes(args: Record<string, unknown>, language: Language) {
  rejectUnknownKeys(args, ["query", "versions", "limit"]);
  const query = text(args.query, "query", 160, false);
  const max = limit(args.limit, 5);
  const rawVersions = args.versions;
  if (rawVersions != null && (!Array.isArray(rawVersions) || rawVersions.length > 5 || rawVersions.some((value) => typeof value !== "string"))) {
    throw new ToolInputError("invalid_versions");
  }
  const versions = (rawVersions as string[] | undefined)?.map((value) => normalizeVersion(text(value, "version", 24))) ?? [];
  if (!query && versions.length === 0) throw new ToolInputError("query_or_versions_required");
  const versionSet = new Set(versions);
  const results = getReleaseHistory(language)
    .map((release) => ({
      release,
      score: versionSet.has(release.version.toLowerCase()) ? 100 : scoreText(`${release.version} ${release.title} ${release.summary} ${release.changes.join(" ")}`, query),
    }))
    .filter(({ release, score }) => (versionSet.size ? versionSet.has(release.version.toLowerCase()) : score > 0))
    .sort((left, right) => right.score - left.score)
    .slice(0, max)
    .map(({ release }) => ({
      version: release.version,
      date: release.date,
      title: release.title,
      summary: release.summary,
      changes: release.changes,
      href: `/patch-notes#${release.version}`,
    }));
  return {
    result: { query, versions, releases: results },
    summary: language === "ru" ? `Найдено релизов: ${results.length}` : `Releases found: ${results.length}`,
    links: results.map((release) => ({ label: `${release.version} — ${release.title}`, href: release.href })),
  };
}

function searchLocalArchive(args: Record<string, unknown>, language: Language, entries: LocalArchiveSearchEntry[]) {
  rejectUnknownKeys(args, ["query", "limit"]);
  const query = text(args.query, "query", 160);
  const max = limit(args.limit, 3);
  const results = entries
    .map((entry) => ({ entry, score: scoreText(`${entry.title} ${entry.project ?? ""} ${entry.excerpt}`, query) }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || right.entry.updatedAt - left.entry.updatedAt)
    .slice(0, max)
    .map(({ entry }) => ({ ...entry, href: `/playground?session=${encodeURIComponent(entry.id)}` }));
  return {
    result: { query, scope: "request_supplied_on_device_index", results },
    summary: language === "ru" ? `Найдено локальных диалогов: ${results.length}` : `Local conversations found: ${results.length}`,
    links: results.map((entry) => ({ label: entry.title, href: entry.href })),
  };
}

function modelCapabilities(args: Record<string, unknown>, language: Language) {
  rejectUnknownKeys(args, ["model"]);
  const requested = text(args.model, "model", 80, false).toLocaleLowerCase();
  const model = ERMA_MODELS.find((entry) => entry.key.toLowerCase() === requested || entry.name.toLowerCase() === requested)
    ?? ERMA_MODELS.find((entry) => entry.available)
    ?? ERMA_MODELS[0];
  const capabilities = getErmaCapabilities(model.key);
  const result = {
    key: model.key,
    name: model.name,
    tier: model.tier,
    status: model.status,
    available: model.available,
    reasoning: capabilities.reasoning,
    vision: capabilities.vision,
    tools: capabilities.toolCalling.enabled,
    toolMode: capabilities.toolCalling.mode,
    maxToolCalls: capabilities.toolCalling.maxCalls,
    requiresDetailedThinkingOffDuringToolPlanning: capabilities.toolCalling.requiresDetailedThinkingOff,
    availableTools: [...capabilities.toolCalling.tools],
  };
  return {
    result,
    summary: language === "ru" ? `Получены возможности модели ${model.name}` : `Capabilities loaded for ${model.name}`,
    links: [{ label: language === "ru" ? "Каталог моделей" : "Model catalog", href: "/models" }],
  };
}

class ArithmeticParser {
  private index = 0;
  constructor(private readonly source: string) {}

  parse() {
    const value = this.expression();
    this.space();
    if (this.index !== this.source.length || !Number.isFinite(value)) throw new ToolInputError("invalid_expression");
    return value;
  }

  private space() { while (/\s/.test(this.source[this.index] ?? "")) this.index += 1; }
  private take(character: string) { this.space(); if (this.source[this.index] !== character) return false; this.index += 1; return true; }
  private expression(): number { let value = this.term(); while (true) { if (this.take("+")) value += this.term(); else if (this.take("-")) value -= this.term(); else return value; } }
  private term(): number { let value = this.power(); while (true) { if (this.take("*")) value *= this.power(); else if (this.take("/")) { const divisor = this.power(); if (divisor === 0) throw new ToolInputError("division_by_zero"); value /= divisor; } else if (this.take("%")) { const divisor = this.power(); if (divisor === 0) throw new ToolInputError("division_by_zero"); value %= divisor; } else return value; } }
  private power(): number { const base = this.unary(); return this.take("^") ? base ** this.power() : base; }
  private unary(): number { if (this.take("+")) return this.unary(); if (this.take("-")) return -this.unary(); return this.primary(); }
  private primary(): number {
    if (this.take("(")) { const value = this.expression(); if (!this.take(")")) throw new ToolInputError("missing_parenthesis"); return value; }
    this.space();
    const match = this.source.slice(this.index).match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/i);
    if (!match) throw new ToolInputError("number_expected");
    this.index += match[0].length;
    const value = Number(match[0]);
    if (!Number.isFinite(value)) throw new ToolInputError("invalid_number");
    return value;
  }
}

function calculate(args: Record<string, unknown>, language: Language) {
  rejectUnknownKeys(args, ["expression"]);
  const expression = text(args.expression, "expression", 120);
  if (!/^[0-9eE+\-*/%^().\s]+$/.test(expression)) throw new ToolInputError("unsupported_character");
  const value = new ArithmeticParser(expression).parse();
  return {
    result: { expression, value },
    summary: language === "ru" ? `Вычисление выполнено: ${value}` : `Calculation completed: ${value}`,
    links: [],
  };
}

function statusSummary(payload: HealthPayload, language: Language) {
  const unavailable = payload.services.filter((service) => service.status !== "operational");
  if (!unavailable.length) return language === "ru" ? "Все обязательные сервисы работают" : "All required services are operational";
  return language === "ru" ? `Сервисы с отклонениями: ${unavailable.length}` : `Services with issues: ${unavailable.length}`;
}

async function execute(name: AiToolName, args: Record<string, unknown>, context: ToolExecutionContext, signal: AbortSignal) {
  if (name === "search_documentation") return searchDocumentation(args, context.language);
  if (name === "search_patch_notes") return searchPatchNotes(args, context.language);
  if (name === "search_local_archive") return searchLocalArchive(args, context.language, context.localArchive);
  if (name === "get_model_capabilities") return modelCapabilities(args, context.language);
  if (name === "calculate") return calculate(args, context.language);
  rejectUnknownKeys(args, []);
  const result = await context.getServiceStatus(signal);
  return {
    result,
    summary: statusSummary(result, context.language),
    links: [{ label: context.language === "ru" ? "Страница статуса" : "Status page", href: "/status" }],
  };
}

function timeout<T>(promise: Promise<T>, controller: AbortController) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => { controller.abort("tool_timeout"); reject(new Error("tool_timeout")); }, AI_TOOL_TIMEOUT_MS);
    promise.then((value) => { clearTimeout(timer); resolve(value); }, (error) => { clearTimeout(timer); reject(error); });
  });
}

function safeToolCallId(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 120) : `tool-${crypto.randomUUID()}`;
}

export async function executeReadOnlyTool(call: RawNvidiaToolCall, context: ToolExecutionContext): Promise<ToolExecutionResult> {
  const startedAt = Date.now();
  const toolCallId = safeToolCallId(call.id);
  const rawName = call.function?.name;
  if (!isAllowedAiToolName(rawName)) {
    const name = "search_documentation" as const;
    return {
      toolCallId,
      name,
      content: JSON.stringify({ ok: false, error: "tool_not_allowed" }),
      trace: { id: toolCallId, name, status: "blocked", durationMs: Date.now() - startedAt, summary: context.language === "ru" ? "Вызов неизвестного инструмента заблокирован" : "Unknown tool call was blocked" },
    };
  }

  try {
    const args = parseArguments(call.function?.arguments);
    const controller = new AbortController();
    const output = await timeout(execute(rawName, args, context, controller.signal), controller);
    const links = safeLinks(output.links);
    console.info("ai.tool_call", { requestId: context.requestId, name: rawName, status: "success", durationMs: Date.now() - startedAt });
    return {
      toolCallId,
      name: rawName,
      content: JSON.stringify({ ok: true, data: output.result }).slice(0, 24_000),
      trace: { id: toolCallId, name: rawName, status: "success", durationMs: Date.now() - startedAt, summary: output.summary.slice(0, 180), ...(links.length ? { links } : {}) },
    };
  } catch (error) {
    const timedOut = error instanceof Error && error.message === "tool_timeout";
    const status = timedOut ? "timeout" : error instanceof ToolInputError ? "blocked" : "error";
    console.info("ai.tool_call", { requestId: context.requestId, name: rawName, status, durationMs: Date.now() - startedAt });
    return {
      toolCallId,
      name: rawName,
      content: JSON.stringify({ ok: false, error: timedOut ? "tool_timeout" : "tool_failed" }),
      trace: {
        id: toolCallId,
        name: rawName,
        status,
        durationMs: Date.now() - startedAt,
        summary: context.language === "ru" ? (timedOut ? "Инструмент не ответил вовремя" : "Инструмент не выполнил запрос") : (timedOut ? "The tool timed out" : "The tool could not complete the request"),
      },
    };
  }
}

export function sanitizeLocalArchiveIndex(value: unknown): LocalArchiveSearchEntry[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const entry = item as Record<string, unknown>;
    if (typeof entry.id !== "string" || typeof entry.title !== "string" || typeof entry.excerpt !== "string") return [];
    const id = entry.id.trim().slice(0, 120);
    const title = entry.title.trim().slice(0, 120);
    if (!id || !title) return [];
    return [{
      id,
      title,
      ...(typeof entry.project === "string" && entry.project.trim() ? { project: entry.project.trim().slice(0, 80) } : {}),
      updatedAt: typeof entry.updatedAt === "number" && Number.isFinite(entry.updatedAt) ? Math.max(0, Math.round(entry.updatedAt)) : 0,
      excerpt: entry.excerpt.replace(/\s+/g, " ").trim().slice(0, 600),
    }];
  }).slice(0, 20);
}
