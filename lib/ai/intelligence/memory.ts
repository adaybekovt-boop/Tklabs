import type { ChatContextMessage } from "@/lib/ai/context";
import type { ErmaIntelligenceRoute } from "@/lib/ai/intelligence/router";
import { buildStructuredChatMemory } from "@/lib/ai/memory";

export type LayeredErmaMemory = {
  schemaVersion: 1;
  persistence: "request-context-only";
  working: Array<{ role: "user" | "assistant"; content: string }>;
  episodic: { goals: string[]; decisions: string[]; openTasks: string[] };
  semantic: { constraints: string[]; facts: string[] };
};

function excerpt(value: string, max = 420) {
  const normalized = value.replace(/\s+/g, " ").trim();
  const chars = Array.from(normalized);
  return chars.length <= max ? normalized : `${chars.slice(0, max - 1).join("")}…`;
}

function queryTerms(query: string) {
  return [...new Set(query.toLocaleLowerCase().replace(/[^\p{L}\p{N}._+-]+/gu, " ").split(" ").filter((item) => item.length > 2))].slice(0, 24);
}

function relevance(value: string, query: string) {
  const haystack = value.toLocaleLowerCase();
  return queryTerms(query).reduce((score, term) => score + (haystack.includes(term) ? 1 : 0), 0);
}

function relevant(items: readonly string[], query: string, max: number) {
  if (!items.length) return [];
  const ranked = items.map((item, index) => ({ item, index, score: relevance(item, query) })).sort((a, b) => b.score - a.score || b.index - a.index);
  const matched = ranked.filter((item) => item.score > 0);
  return (matched.length ? matched : ranked.slice(-Math.min(max, ranked.length))).slice(0, max).map((item) => item.item);
}

export function buildLayeredErmaMemory(messages: readonly ChatContextMessage[]): LayeredErmaMemory {
  const structured = buildStructuredChatMemory(messages.map((message) => ({ role: message.role, content: message.content })));
  return {
    schemaVersion: 1,
    persistence: "request-context-only",
    working: messages.slice(-4).map((message) => ({ role: message.role, content: excerpt(message.content) })),
    episodic: { goals: structured.goals, decisions: structured.decisions, openTasks: structured.openTasks },
    semantic: { constraints: structured.constraints, facts: structured.facts },
  };
}

export function renderRouteAwareMemory(memory: LayeredErmaMemory, route: ErmaIntelligenceRoute, query: string) {
  const lines = ["ROUTE-AWARE MEMORY (conversation context, not authoritative external evidence):"];
  const add = (title: string, items: readonly string[]) => { if (items.length) lines.push(`${title}:`, ...items.map((item) => `- ${item}`)); };

  if (route.intent === "planning" || route.intent === "code" || route.intent === "analysis") {
    add("Goals", relevant(memory.episodic.goals, query, 4));
    add("Decisions", relevant(memory.episodic.decisions, query, 4));
    add("Constraints", relevant(memory.semantic.constraints, query, 5));
    add("Open tasks", relevant(memory.episodic.openTasks, query, 4));
  } else if (route.intent === "conversation") {
    add("Recent context", memory.working.map((item) => `${item.role}: ${item.content}`).slice(-4));
  } else {
    add("Relevant constraints", relevant(memory.semantic.constraints, query, 4));
    add("Relevant facts", relevant(memory.semantic.facts, query, 5));
    add("Relevant decisions", relevant(memory.episodic.decisions, query, 3));
  }

  return lines.length > 1 ? lines.join("\n").slice(0, 6_000) : "";
}
