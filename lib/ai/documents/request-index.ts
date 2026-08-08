import type { ChatAttachment } from "@/lib/chat-prompt";

export type DocumentChunk = {
  id: string;
  document: string;
  chunk: number;
  text: string;
};

export type DocumentSearchResult = DocumentChunk & {
  score: number;
};

const TARGET_CHUNK_CHARS = 1_600;
const CHUNK_OVERLAP_CHARS = 180;
const MAX_DOCUMENT_CHUNKS = 96;

function normalize(value: string) {
  return value.toLocaleLowerCase().replace(/[^\p{L}\p{N}._+-]+/gu, " ").replace(/\s+/g, " ").trim();
}

function terms(value: string) {
  return [...new Set(normalize(value).split(" ").filter((item) => item.length > 1))].slice(0, 32);
}

function chunkDocument(document: ChatAttachment) {
  const source = document.content.replace(/\r/g, "").trim();
  const chunks: DocumentChunk[] = [];
  let start = 0;
  let index = 0;
  while (start < source.length && chunks.length < MAX_DOCUMENT_CHUNKS) {
    let end = Math.min(source.length, start + TARGET_CHUNK_CHARS);
    if (end < source.length) {
      const paragraph = source.lastIndexOf("\n\n", end);
      const sentence = source.lastIndexOf(". ", end);
      const boundary = Math.max(paragraph, sentence);
      if (boundary > start + Math.floor(TARGET_CHUNK_CHARS * 0.55)) end = boundary + (boundary === paragraph ? 2 : 1);
    }
    const text = source.slice(start, end).trim();
    if (text) chunks.push({ id: `doc-${index + 1}:${document.name}`, document: document.name, chunk: index + 1, text });
    if (end >= source.length) break;
    start = Math.max(start + 1, end - CHUNK_OVERLAP_CHARS);
    index += 1;
  }
  return chunks;
}

export function buildRequestDocumentIndex(documents: readonly ChatAttachment[]) {
  return documents.flatMap(chunkDocument).slice(0, MAX_DOCUMENT_CHUNKS);
}

function scoreChunk(chunk: DocumentChunk, query: string) {
  const queryTerms = terms(query);
  if (!queryTerms.length) return 1;
  const title = normalize(chunk.document);
  const haystack = normalize(chunk.text);
  let score = 0;
  for (const term of queryTerms) {
    if (title.includes(term)) score += 6;
    const first = haystack.indexOf(term);
    if (first >= 0) {
      score += 3;
      if (first < 260) score += 1;
    }
  }
  const phrase = normalize(query);
  if (phrase.length >= 5 && haystack.includes(phrase)) score += 12;
  return score;
}

export function searchRequestDocuments(documents: readonly ChatAttachment[], query: string, limit = 5) {
  const max = Math.max(1, Math.min(8, Math.trunc(limit)));
  return buildRequestDocumentIndex(documents)
    .map((chunk) => ({ ...chunk, score: scoreChunk(chunk, query) }))
    .filter((chunk) => chunk.score > 0)
    .sort((left, right) => right.score - left.score || left.document.localeCompare(right.document) || left.chunk - right.chunk)
    .slice(0, max);
}

export function summarizeRequestDocuments(documents: readonly ChatAttachment[]) {
  return documents.slice(0, 8).map((document) => ({
    name: document.name,
    characters: Array.from(document.content).length,
    chunks: chunkDocument(document).length,
  }));
}
