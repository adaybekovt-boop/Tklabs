import type { AiToolName } from "@/lib/ai/types";

export type ErmaEvidenceKind = "web" | "tklab" | "math" | "document" | "code" | "internal";
export type ErmaEvidence = {
  id: string;
  kind: ErmaEvidenceKind;
  title: string;
  href?: string;
  version?: string;
  detail?: string;
  tool: AiToolName;
  trust: "untrusted_external_web" | "tklab_source_of_truth" | "deterministic_math_engine" | "untrusted_user_document" | "isolated_code_sandbox" | "internal_read_only";
};

export type RawToolEvidence = { name: AiToolName; content: string };
function parse(content: string) { try { return JSON.parse(content) as { ok?: unknown; data?: unknown }; } catch { return null; } }
function object(value: unknown): Record<string, unknown> | null { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null; }
function text(value: unknown, max = 500) { return typeof value === "string" ? value.trim().slice(0, max) : ""; }

function pushWebSearch(output: ErmaEvidence[], name: AiToolName, data: Record<string, unknown>) {
  if (!Array.isArray(data.results)) return;
  for (const item of data.results) { const entry = object(item); if (!entry) continue; const href = text(entry.url, 2_000); const title = text(entry.title, 220); const id = text(entry.id, 120); if (!href || !title) continue; output.push({ id: id || `web:${href}`, kind: "web", title, href, tool: name, trust: "untrusted_external_web" }); }
}
function pushWebOpen(output: ErmaEvidence[], name: AiToolName, data: Record<string, unknown>) { const href = text(data.url, 2_000); const title = text(data.title, 220); const id = text(data.id, 120); if (href && title) output.push({ id: id || `web:${href}`, kind: "web", title, href, tool: name, trust: "untrusted_external_web" }); }
function pushTkLab(output: ErmaEvidence[], name: AiToolName, data: Record<string, unknown>) {
  if (!Array.isArray(data.results)) return;
  for (const item of data.results) { const entry = object(item); if (!entry) continue; const title = text(entry.title, 220); const href = text(entry.href, 600); const id = text(entry.id, 160); const version = text(entry.version, 80); if (!title || !href) continue; output.push({ id: id || `tklab:${href}:${title}`, kind: "tklab", title, href, ...(version ? { version } : {}), tool: name, trust: "tklab_source_of_truth" }); }
}
function pushDocuments(output: ErmaEvidence[], name: AiToolName, data: Record<string, unknown>) {
  if (!Array.isArray(data.results)) return;
  for (const item of data.results) { const entry = object(item); if (!entry) continue; const document = text(entry.document, 160); const chunk = typeof entry.chunk === "number" ? entry.chunk : 0; const id = text(entry.id, 220) || `document:${document}:${chunk}`; if (!document) continue; output.push({ id, kind: "document", title: document, detail: chunk ? `chunk ${chunk}` : undefined, tool: name, trust: "untrusted_user_document" }); }
}

export function collectErmaEvidence(toolData: readonly RawToolEvidence[]) {
  const output: ErmaEvidence[] = [];
  for (const item of toolData) {
    const payload = parse(item.content); if (!payload || payload.ok !== true) continue; const data = object(payload.data); if (!data) continue;
    if (item.name === "search_web") pushWebSearch(output, item.name, data);
    else if (item.name === "open_web_result") pushWebOpen(output, item.name, data);
    else if (item.name === "search_tklab_knowledge") pushTkLab(output, item.name, data);
    else if (item.name === "search_documents") pushDocuments(output, item.name, data);
    else if (item.name === "solve_math" || item.name === "calculate") output.push({ id: `math:${output.length + 1}`, kind: "math", title: "Deterministic math result", tool: item.name, trust: "deterministic_math_engine" });
    else if (item.name === "run_code_sandbox") output.push({ id: `code:${output.length + 1}`, kind: "code", title: `Isolated sandbox execution · exit ${typeof data.exitCode === "number" ? data.exitCode : "?"}`, tool: item.name, trust: "isolated_code_sandbox" });
    else output.push({ id: `internal:${item.name}:${output.length + 1}`, kind: "internal", title: item.name, tool: item.name, trust: "internal_read_only" });
  }
  const seen = new Set<string>();
  return output.filter((entry) => { const key = entry.href ? `${entry.kind}:${entry.href}` : entry.id; if (seen.has(key)) return false; seen.add(key); return true; }).slice(0, 32);
}

export function evidencePromptBlock(evidence: readonly ErmaEvidence[]) {
  if (!evidence.length) return "";
  return ["EVIDENCE INDEX (cite actual href values for web/TK LAB evidence; attribute document evidence by document/chunk; do not invent citations):", ...evidence.map((entry, index) => `${index + 1}. [${entry.kind}] ${entry.title}${entry.detail ? ` · ${entry.detail}` : ""}${entry.version ? ` · ${entry.version}` : ""}${entry.href ? ` · ${entry.href}` : ""}`)].join("\n");
}
