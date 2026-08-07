export const PROVIDER_TIMEOUT_MS = 30_000;
export const PROVIDER_STREAM_TOTAL_TIMEOUT_MS = 120_000;
export const PROVIDER_STREAM_IDLE_TIMEOUT_MS = 20_000;

export type ProviderTimeoutCode = "provider_total_timeout" | "provider_idle_timeout";

export class ProviderTimeoutError extends Error {
  readonly code: ProviderTimeoutCode;

  constructor(code: ProviderTimeoutCode) {
    super(code);
    this.name = "ProviderTimeoutError";
    this.code = code;
  }
}

export type ProviderRequestOptions = {
  timeoutMs?: number;
  idleTimeoutMs?: number;
};

export type ProviderResponseLifecycle = {
  signal: AbortSignal;
  touch(): void;
  abort(reason?: unknown): void;
};

export function withTimeout<T>(promise: Promise<T>, timeoutMs = PROVIDER_TIMEOUT_MS) {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("provider_timeout")), timeoutMs);
    promise.then(resolve, reject).finally(() => clearTimeout(timeout));
  });
}

function positiveTimeout(value: number | undefined, fallback: number) {
  return Number.isFinite(value) && Number(value) > 0 ? Number(value) : fallback;
}

function createProviderRequestLifecycle(externalSignal: AbortSignal | null | undefined, options: ProviderRequestOptions) {
  const controller = new AbortController();
  const timeoutMs = positiveTimeout(options.timeoutMs, PROVIDER_TIMEOUT_MS);
  const idleTimeoutMs = Number.isFinite(options.idleTimeoutMs) && Number(options.idleTimeoutMs) > 0
    ? Number(options.idleTimeoutMs)
    : 0;
  let timeoutError: ProviderTimeoutError | null = null;
  let idleTimer: ReturnType<typeof setTimeout> | undefined;

  const abortWithTimeout = (code: ProviderTimeoutCode) => {
    if (controller.signal.aborted) return;
    timeoutError = new ProviderTimeoutError(code);
    controller.abort(timeoutError);
  };
  const totalTimer = setTimeout(() => abortWithTimeout("provider_total_timeout"), timeoutMs);
  const abortExternal = () => {
    if (!controller.signal.aborted) controller.abort(externalSignal?.reason);
  };
  const touch = () => {
    if (!idleTimeoutMs || controller.signal.aborted) return;
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => abortWithTimeout("provider_idle_timeout"), idleTimeoutMs);
  };
  const abort = (reason?: unknown) => {
    if (!controller.signal.aborted) controller.abort(reason);
  };

  if (externalSignal?.aborted) abortExternal();
  else externalSignal?.addEventListener("abort", abortExternal, { once: true });

  return {
    signal: controller.signal,
    touch,
    abort,
    getTimeoutError: () => timeoutError,
    cleanup() {
      clearTimeout(totalTimer);
      if (idleTimer) clearTimeout(idleTimer);
      externalSignal?.removeEventListener("abort", abortExternal);
    },
  };
}

/**
 * Keep timeout and external-abort ownership active until the response body has
 * been fully consumed. This prevents a streaming provider connection from
 * outliving the browser request after response headers have already arrived.
 */
export async function withProviderResponse<T>(
  input: RequestInfo | URL,
  init: RequestInit,
  consume: (response: Response, lifecycle: ProviderResponseLifecycle) => Promise<T>,
  options: ProviderRequestOptions = {},
): Promise<T> {
  const lifecycle = createProviderRequestLifecycle(init.signal, options);

  try {
    const response = await fetch(input, { ...init, signal: lifecycle.signal });
    lifecycle.touch();
    return await consume(response, {
      signal: lifecycle.signal,
      touch: lifecycle.touch,
      abort: lifecycle.abort,
    });
  } catch (error) {
    throw lifecycle.getTimeoutError() ?? error;
  } finally {
    lifecycle.cleanup();
  }
}

export function newRequestId() {
  return crypto.randomUUID();
}
