export const DOCUMENT_ACCEPT = "text/plain,text/markdown,text/csv,application/json,application/pdf,.txt,.md,.csv,.json,.pdf";
export const DEFAULT_DOCUMENT_SOURCE_LIMIT = 2 * 1024 * 1024;

export type ExtractedDocumentKind = "text" | "markdown" | "csv" | "json" | "pdf";

export type ExtractedDocument = {
  name: string;
  kind: ExtractedDocumentKind;
  content: string;
  sourceBytes: number;
};

export class DocumentExtractionError extends Error {
  readonly code: "unsupported" | "too_large" | "empty" | "pdf_text_unavailable";

  constructor(code: DocumentExtractionError["code"], message: string) {
    super(message);
    this.name = "DocumentExtractionError";
    this.code = code;
  }
}

function extension(name: string) {
  const match = name.trim().toLowerCase().match(/\.([a-z0-9]+)$/);
  return match?.[1] ?? "";
}

function kindFor(file: File): ExtractedDocumentKind | null {
  const ext = extension(file.name);
  if (file.type === "application/pdf" || ext === "pdf") return "pdf";
  if (file.type === "application/json" || ext === "json") return "json";
  if (file.type === "text/csv" || ext === "csv") return "csv";
  if (file.type === "text/markdown" || ext === "md") return "markdown";
  if (file.type.startsWith("text/") || ext === "txt") return "text";
  return null;
}

function cleanText(value: string) {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim();
}

function boundText(value: string, maxCharacters: number, maxOutputBytes: number) {
  let text = Array.from(cleanText(value)).slice(0, Math.max(1, maxCharacters)).join("");
  const encoder = new TextEncoder();
  if (encoder.encode(text).byteLength <= maxOutputBytes) return text;
  const bytes = encoder.encode(text).slice(0, Math.max(1, maxOutputBytes));
  text = new TextDecoder().decode(bytes).replace(/\uFFFD+$/g, "").trim();
  return text;
}

function decodePdfLiteral(value: string) {
  return value.replace(/\\([0-7]{1,3}|n|r|t|b|f|\(|\)|\\)/g, (_match, escaped: string) => {
    if (/^[0-7]+$/.test(escaped)) return String.fromCharCode(Number.parseInt(escaped, 8));
    if (escaped === "n") return "\n";
    if (escaped === "r") return "\r";
    if (escaped === "t") return "\t";
    if (escaped === "b") return "\b";
    if (escaped === "f") return "\f";
    return escaped;
  });
}

function decodePdfHex(value: string) {
  const hex = value.replace(/\s+/g, "");
  const even = hex.length % 2 === 0 ? hex : `${hex}0`;
  const bytes = new Uint8Array(even.length / 2);
  for (let index = 0; index < bytes.length; index += 1) bytes[index] = Number.parseInt(even.slice(index * 2, index * 2 + 2), 16);
  const utf16 = bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff;
  if (utf16) {
    let output = "";
    for (let index = 2; index + 1 < bytes.length; index += 2) output += String.fromCharCode((bytes[index] << 8) | bytes[index + 1]);
    return output;
  }
  return new TextDecoder("latin1").decode(bytes);
}

export function extractPdfTextFromBytes(bytes: Uint8Array, maxCharacters = 24_000) {
  const raw = new TextDecoder("latin1").decode(bytes);
  if (!raw.startsWith("%PDF-")) return "";
  const chunks: string[] = [];
  const addLiteral = (literal: string) => {
    const decoded = cleanText(decodePdfLiteral(literal));
    if (decoded) chunks.push(decoded);
  };

  for (const match of raw.matchAll(/\(((?:\\.|[^\\)])*)\)\s*Tj/g)) addLiteral(match[1] ?? "");
  for (const match of raw.matchAll(/<([0-9A-Fa-f\s]+)>\s*Tj/g)) {
    const decoded = cleanText(decodePdfHex(match[1] ?? ""));
    if (decoded) chunks.push(decoded);
  }
  for (const match of raw.matchAll(/\[((?:.|\n|\r)*?)\]\s*TJ/g)) {
    const body = match[1] ?? "";
    const parts: string[] = [];
    for (const inner of body.matchAll(/\(((?:\\.|[^\\)])*)\)|<([0-9A-Fa-f\s]+)>/g)) {
      const value = inner[1] != null ? decodePdfLiteral(inner[1]) : decodePdfHex(inner[2] ?? "");
      if (value.trim()) parts.push(value);
    }
    if (parts.length) chunks.push(parts.join(""));
  }

  const text = cleanText(chunks.join("\n"));
  return Array.from(text).slice(0, Math.max(1, maxCharacters)).join("");
}

export async function extractDocumentFile(file: File, options?: {
  maxSourceBytes?: number;
  maxOutputBytes?: number;
  maxCharacters?: number;
}): Promise<ExtractedDocument> {
  const maxSourceBytes = Math.max(1, options?.maxSourceBytes ?? DEFAULT_DOCUMENT_SOURCE_LIMIT);
  const maxOutputBytes = Math.max(1, options?.maxOutputBytes ?? 64 * 1024);
  const maxCharacters = Math.max(1, options?.maxCharacters ?? 24_000);
  if (file.size > maxSourceBytes) throw new DocumentExtractionError("too_large", "Document source is too large.");
  const kind = kindFor(file);
  if (!kind) throw new DocumentExtractionError("unsupported", "Document type is not supported.");
  const cleanName = file.name.trim();
  if (!cleanName || Array.from(cleanName).length > 120) throw new DocumentExtractionError("unsupported", "Document name is invalid.");

  let content = "";
  if (kind === "pdf") {
    content = extractPdfTextFromBytes(new Uint8Array(await file.arrayBuffer()), maxCharacters);
    if (!content) throw new DocumentExtractionError("pdf_text_unavailable", "This PDF does not expose bounded plain text.");
  } else {
    content = await file.text();
    if (kind === "json") {
      try { content = JSON.stringify(JSON.parse(content), null, 2); } catch { /* Keep original JSON-like text for the model. */ }
    }
  }

  content = boundText(content, maxCharacters, maxOutputBytes);
  if (!content) throw new DocumentExtractionError("empty", "Document does not contain usable text.");
  return { name: cleanName, kind, content, sourceBytes: file.size };
}
