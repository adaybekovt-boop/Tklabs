import { sanitizeSearchQuery } from "@/lib/ai/intelligence/grounding";
import type { AiGroundingCitation, AiGroundingMeta } from "@/lib/ai/types";
import { validatePublicWebUrl } from "@/lib/ai/web/gateway";

const GOOGLE_GROUNDING_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/interactions";
const DEFAULT_DIRECT_GROUNDING_MODEL = "gemini-2.5-flash";
const DEFAULT_RETRIEVAL_GROUNDING_MODEL = "gemini-2.5-flash-lite";
const MAX_SEARCH_SUGGESTIONS_HTML = 60_000;

export type GoogleDirectGroundingResult = {
  answer: string;
  model: string;
  grounding: AiGroundingMeta;
};

type GoogleAnnotation = {
  type?: unknown;
  url?: unknown;
  uri?: unknown;
  title?: unknown;
  start_index?: unknown;
  end_index?: unknown;
  startIndex?: unknown;
  endIndex?: unknown;
};
type GoogleTextBlock = { type?: unknown; text?: unknown; annotations?: unknown };
type GoogleSearchCallArguments = { queries?: unknown };
type GoogleSearchResultItem = { search_suggestions?: unknown };
type GoogleInteractionStep = {
  type?: unknown;
  content?: unknown;
  result?: unknown;
  arguments?: unknown;
};
type GoogleInteractionPayload = { steps?: GoogleInteractionStep[]; status?: unknown };

function groundingKey() {
  return process.env.GOOGLE_GEMINI_API_KEY?.trim() || process.env.GEMINI_API_KEY?.trim() || "";
}

export function isGoogleDirectGroundingConfigured() {
  return Boolean(groundingKey());
}

function directGroundingModels() {
  const preferred = process.env.GOOGLE_DIRECT_GROUNDING_MODEL?.trim() || DEFAULT_DIRECT_GROUNDING_MODEL;
  const retrievalFallback = process.env.GOOGLE_GROUNDING_MODEL?.trim() || DEFAULT_RETRIEVAL_GROUNDING_MODEL;
  return [...new Set([preferred, retrievalFallback].filter(Boolean))];
}

function boundedText(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function citationFromAnnotation(annotation: GoogleAnnotation): AiGroundingCitation | null {
  if (annotation.type !== "url_citation") return null;
  const rawUrl = boundedText(annotation.url ?? annotation.uri, 2_000);
  if (!rawUrl) return null;
  let url: URL;
  try { url = validatePublicWebUrl(rawUrl); } catch { return null; }
  const title = boundedText(annotation.title, 220) || url.hostname.replace(/^www\./, "");
  const start = Number(annotation.start_index ?? annotation.startIndex);
  const end = Number(annotation.end_index ?? annotation.endIndex);
  return {
    title,
    url: url.href,
    ...(Number.isFinite(start) && start >= 0 ? { startIndex: Math.round(start) } : {}),
    ...(Number.isFinite(end) && end >= 0 ? { endIndex: Math.round(end) } : {}),
  };
}

function extractSearchSuggestions(result: unknown) {
  const items = Array.isArray(result) ? result : result && typeof result === "object" ? [result] : [];
  for (const item of items) {
    const suggestion = (item as GoogleSearchResultItem)?.search_suggestions;
    if (typeof suggestion === "string" && suggestion.trim()) {
      if (suggestion.length > MAX_SEARCH_SUGGESTIONS_HTML) throw new Error("google_grounding_suggestions_too_large");
      return suggestion;
    }
  }
  return "";
}

async function requestGrounding(apiKey: string, model: string, input: string, signal?: AbortSignal) {
  const response = await fetch(GOOGLE_GROUNDING_ENDPOINT, {
    method: "POST",
    signal,
    cache: "no-store",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      model,
      input,
      store: false,
      tools: [{ type: "google_search" }],
    }),
  });
  if (!response.ok) throw Object.assign(new Error(`google_grounding_http_${response.status}`), { status: response.status });
  return await response.json().catch(() => null) as GoogleInteractionPayload | null;
}

function parseGroundingPayload(payload: GoogleInteractionPayload | null, model: string): GoogleDirectGroundingResult {
  const steps = Array.isArray(payload?.steps) ? payload.steps : [];
  const answerParts: string[] = [];
  const searchQueries: string[] = [];
  const citations: AiGroundingCitation[] = [];
  let searchSuggestionsHtml = "";
  let searchUsed = false;

  for (const step of steps) {
    if (step?.type === "google_search_call") {
      searchUsed = true;
      const queries = (step.arguments as GoogleSearchCallArguments | undefined)?.queries;
      if (Array.isArray(queries)) {
        for (const queryValue of queries) {
          const value = boundedText(queryValue, 400);
          if (value && !searchQueries.includes(value)) searchQueries.push(value);
        }
      }
      continue;
    }

    if (step?.type === "google_search_result") {
      searchUsed = true;
      const suggestion = extractSearchSuggestions(step.result);
      if (suggestion && !searchSuggestionsHtml) searchSuggestionsHtml = suggestion;
      continue;
    }

    if (step?.type !== "model_output" || !Array.isArray(step.content)) continue;
    for (const rawBlock of step.content) {
      const block = rawBlock as GoogleTextBlock;
      if (block?.type !== "text" || typeof block.text !== "string") continue;
      answerParts.push(block.text);
      if (!Array.isArray(block.annotations)) continue;
      for (const rawAnnotation of block.annotations) {
        const citation = citationFromAnnotation(rawAnnotation as GoogleAnnotation);
        if (citation && !citations.some((entry) => entry.url === citation.url && entry.startIndex === citation.startIndex && entry.endIndex === citation.endIndex)) citations.push(citation);
      }
    }
  }

  const answer = answerParts.join("");
  if (!answer.trim()) throw new Error("google_grounding_empty_answer");
  if (!searchUsed) throw new Error("google_grounding_search_not_used");
  if (!searchSuggestionsHtml) throw new Error("google_grounding_missing_search_suggestions");
  if (!citations.length) throw new Error("google_grounding_missing_citations");

  return {
    answer,
    model,
    grounding: {
      provider: "google-search",
      directPassThrough: true,
      searchQueries: searchQueries.slice(0, 8),
      citations: citations.slice(0, 16),
      searchSuggestionsHtml,
    },
  };
}

export async function getGoogleDirectGrounding(query: string, signal?: AbortSignal): Promise<GoogleDirectGroundingResult> {
  const apiKey = groundingKey();
  if (!apiKey) throw new Error("google_grounding_not_configured");
  const sanitized = sanitizeSearchQuery(query);
  if (!sanitized) throw new Error("google_grounding_query_empty");

  let lastError: unknown;
  const models = directGroundingModels();
  for (let index = 0; index < models.length; index += 1) {
    const model = models[index];
    try {
      return parseGroundingPayload(await requestGrounding(apiKey, model, sanitized, signal), model);
    } catch (error) {
      lastError = error;
      const status = typeof error === "object" && error && "status" in error && typeof error.status === "number" ? error.status : undefined;
      const mayTryCompatibilityModel = index + 1 < models.length && (status === 400 || status === 404);
      if (!mayTryCompatibilityModel) throw error;
    }
  }

  throw lastError ?? new Error("google_grounding_failed");
}
