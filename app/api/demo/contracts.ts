import type { ErmaTone } from "@/lib/models/server";

export type Language = "ru" | "en";
export type ReasoningEffort = "low" | "medium" | "high";

export type ChatRequest = {
  prompt?: unknown;
  messages?: unknown;
  locale?: unknown;
  model?: unknown;
  reasonEnabled?: unknown;
  effort?: unknown;
  tone?: unknown;
  attachments?: unknown;
  localArchive?: unknown;
  personalMemory?: unknown;
};

export function normalizeLanguage(value: unknown): Language {
  return value === "en" ? "en" : "ru";
}

export function normalizeEffort(value: unknown): ReasoningEffort {
  return value === "low" || value === "high" ? value : "medium";
}

export function normalizeTone(value: unknown): ErmaTone {
  if (value === "character") return "character";
  if (value === "erma") return "erma";
  return "professional";
}

export function acceptsEventStream(request: Request) {
  return request.headers.get("accept")?.toLowerCase().includes("text/event-stream") === true;
}
