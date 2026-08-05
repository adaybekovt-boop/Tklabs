export const PROVIDER_TIMEOUT_MS = 30_000;

export function withTimeout<T>(promise: Promise<T>, timeoutMs = PROVIDER_TIMEOUT_MS) {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("provider_timeout")), timeoutMs);
    promise.then(resolve, reject).finally(() => clearTimeout(timeout));
  });
}

export async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit, timeoutMs = PROVIDER_TIMEOUT_MS) {
  const controller = new AbortController();
  const abortExternal = () => controller.abort();
  const externalSignal = init.signal;
  if (externalSignal?.aborted) controller.abort();
  else externalSignal?.addEventListener("abort", abortExternal, { once: true });
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
    externalSignal?.removeEventListener("abort", abortExternal);
  }
}

export function newRequestId() {
  return crypto.randomUUID();
}
