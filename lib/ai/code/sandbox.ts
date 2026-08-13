export type SandboxLanguage = "javascript" | "typescript" | "python";
export type SandboxResult = {
  language: SandboxLanguage;
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs?: number;
  truncated: boolean;
};

const MAX_CODE_CHARS = 20_000;
const MAX_STDIN_CHARS = 8_000;
const MAX_OUTPUT_CHARS = 16_000;
const REQUEST_TIMEOUT_MS = 9_000;

export class CodeSandboxError extends Error {}

function sandboxConfig() {
  const rawUrl = process.env.CODE_SANDBOX_URL?.trim() || "";
  const token = process.env.CODE_SANDBOX_TOKEN?.trim() || "";
  if (!rawUrl || !token) throw new CodeSandboxError("code_sandbox_not_configured");
  let url: URL;
  try { url = new URL(rawUrl); } catch { throw new CodeSandboxError("code_sandbox_url_invalid"); }
  if (url.protocol !== "https:" || url.username || url.password) throw new CodeSandboxError("code_sandbox_url_invalid");
  return { url, token };
}

function normalizeLanguage(value: unknown): SandboxLanguage {
  if (value === "javascript" || value === "typescript" || value === "python") return value;
  throw new CodeSandboxError("unsupported_sandbox_language");
}

function boundedText(value: unknown, name: string, max: number, required = true) {
  if (value == null && !required) return "";
  if (typeof value !== "string") throw new CodeSandboxError(`${name}_must_be_string`);
  const normalized = value.slice(0, max + 1);
  if (required && !normalized.trim()) throw new CodeSandboxError(`${name}_required`);
  if (normalized.length > max) throw new CodeSandboxError(`${name}_too_large`);
  return normalized;
}

function output(value: unknown) {
  return typeof value === "string" ? value.slice(0, MAX_OUTPUT_CHARS) : "";
}

async function readJsonBounded(response: Response, maxBytes: number) {
  const body = response.body;
  if (!body) return null;
  const reader = body.getReader();
  const decoder = new TextDecoder();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBytes) throw new CodeSandboxError("code_sandbox_response_too_large");
      chunks.push(value);
    }
  } finally {
    try { await reader.cancel(); } catch { /* no-op */ }
  }
  const merged = new Uint8Array(chunks.reduce((total, chunk) => total + chunk.length, 0));
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }
  try {
    return JSON.parse(decoder.decode(merged)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function runCodeSandbox(input: { language: unknown; code: unknown; stdin?: unknown }, parentSignal?: AbortSignal): Promise<SandboxResult> {
  const { url, token } = sandboxConfig();
  const language = normalizeLanguage(input.language);
  const code = boundedText(input.code, "code", MAX_CODE_CHARS);
  const stdin = boundedText(input.stdin, "stdin", MAX_STDIN_CHARS, false);
  const controller = new AbortController();
  const abort = () => controller.abort(parentSignal?.reason ?? "parent_aborted");
  if (parentSignal?.aborted) abort();
  else parentSignal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(() => controller.abort("sandbox_timeout"), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "POST",
      signal: controller.signal,
      cache: "no-store",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        language,
        code,
        stdin,
        network: false,
        filesystem: "temporary",
        limits: { wallTimeMs: 5_000, memoryMb: 128, processes: 1 },
      }),
    });
    if (!response.ok) throw new CodeSandboxError(`code_sandbox_http_${response.status}`);
    const payload = await readJsonBounded(response, 256_000);
    if (!payload) throw new CodeSandboxError("code_sandbox_invalid_response");
    const exitCode = typeof payload.exitCode === "number" && Number.isInteger(payload.exitCode) ? payload.exitCode : -1;
    const rawStdout = typeof payload.stdout === "string" ? payload.stdout : "";
    const rawStderr = typeof payload.stderr === "string" ? payload.stderr : "";
    return {
      language,
      stdout: output(rawStdout),
      stderr: output(rawStderr),
      exitCode,
      ...(typeof payload.durationMs === "number" && Number.isFinite(payload.durationMs) ? { durationMs: Math.max(0, payload.durationMs) } : {}),
      truncated: rawStdout.length > MAX_OUTPUT_CHARS || rawStderr.length > MAX_OUTPUT_CHARS,
    };
  } catch (error) {
    if (controller.signal.aborted) throw new CodeSandboxError("code_sandbox_timeout");
    throw error;
  } finally {
    clearTimeout(timer);
    parentSignal?.removeEventListener("abort", abort);
  }
}
