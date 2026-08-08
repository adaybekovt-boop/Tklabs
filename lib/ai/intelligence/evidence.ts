import type { AiToolName } from "@/lib/ai/types";

export type ErmaEvidenceKind = "web" | "tklab" | "math" | "internal";
export type ErmaEvidence = {
  id: string;
  kind: ErmaEvidenceKind;
  title: string;
  href?: string;
  version?: string;
  tool: AiToolName;
  trust: "untrusted_external_web" | "tklab_source_of_truth" | "deterministic_math_engine" | "internal_read_only";
};

export type RawToolEvidence = { name: AiToolName; content: string };

function parse(content: string) {
  try { return JSON.parse(content) as { ok?: unknown; data?: unknown }; } catch { return null; }
}

function object(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function text(value: unknown, max = 500) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function pushWebSearch(output: ErmaEvidence[], name: AiToolName, data: Record<string, unknown>) {
  if (!Array.isArray(data.results)) return;
  for (const item of data.results) {
    const entry = object(item); if (!entry) continue;
    const href = text(entry.url, 2_000); const title = text(entry.title, 220); const id = text(entry.id, 120);
    if (!href || !title) continue;
    output.push({ id: id || `web:${href}`, kind: "web", title, href, tool: name, trust: "untrusted_external_web" });
  }
}

function pushWebOpen(output: ErmaEvidence[], name: AiToolName, data: Record<string, unknown>) {
  const href = text(data.url, 2_000); const title = text(data.title, 220); const id = text(data.id, 120);
  if (href && title) output.push({ id: id || `web:${href}`, kind: "web", title, href, tool: name, trust: "untrusted_external_web" });
}

function pushTkLab(output: ErmaEvidence[], name: AiToolName, data: Record<string, unknown>) {
  if (!Array.isArray(data.results)) return;
  for (const item of data.results) {
    const entry = object(item); if (!entry) continue;
    const title = text(entry.title, 220); const href = text(entry.href, 600); const id = text(entry.id, 160); const version = text(entry.version, 80);
    if (!title || !href) continue;
    output.push({ id: id || `tklab:${href}:${title}`, kind: "tklab", title, href, ...(version ? { version } : {}), tool: name, trust: "tklab_source_of_truth" });
  }
}

export function collectErmaEvidence(toolData: readonly RawToolEvidence[]) {
  const output: ErmaEvidence[] = [];
  for (const item of toolData) {
    const payload = parse(item.content);
    if (!payload || payload.ok !== true) continue;
    const data = object(payload.data);
    if (!data) continue;
    if (item.name === "search_web") pushWebSearch(output, item.name, data);
    else if (item.name === "open_web_result") pushWebOpen(output, item.name, data);
    else if (item.name === "search_tklab_knowledge") pushTkLab(output, item.name, data);
    else if (item.name === "solve_math" || item.name === "calculate") {
      output.push({ id: `math:${output.length + 1}`, kind: "math", title: "Deterministic math result", tool: item.name, trust: "deterministic_math_engine" });
    } else {
      output.push({ id: `internal:${item.name}:${output.length + 1}`, kind: "internal", title: item.name, tool: item.name, trust: "internal_read_only" });
    }
  }
  const seen = new Set<string>();
  return output.filter((entry) => { const key = entry.href ? `${entry.kind}:${entry.href}` : entry.id; if (seen.has(key)) return false; seen.add(key); return true; }).slice(0, 24);
}

export function evidencePromptBlock(evidence: readonly ErmaEvidence[]) {
  if (!evidence.length) return "";
  return [
    "EVIDENCE INDEX (cite relevant href values; do not invent citations):",
    ...evidence.map((entry, index) => `${index + 1}. [${entry.kind}] ${entry.title}${entry.version ? ` · ${entry.version}` : ""}${entry.href ? ` · ${entry.href}` : ""}`),
  ].join("\n");
}
