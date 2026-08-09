import { env } from "cloudflare:workers";

import type { InferenceSchedulerNamespace } from "@/lib/inference-scheduler";

import type {
  ErmaGenerationInput,
  ErmaProviderLane,
  ProviderLease,
  ProviderLeaseOutcome,
  ProviderLeaseResult,
} from "./contracts";

const DEFAULT_ADMISSION_WAIT_MS = 1_500;

function schedulerNamespace() {
  return (env as unknown as { INFERENCE_SCHEDULER?: InferenceSchedulerNamespace }).INFERENCE_SCHEDULER;
}

function admissionWaitMs() {
  const parsed = Number.parseInt(process.env.ERMA_ADMISSION_WAIT_MS?.trim() ?? "", 10);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(10_000, parsed)) : DEFAULT_ADMISSION_WAIT_MS;
}

function delay(ms: number, signal?: AbortSignal) {
  if (signal?.aborted) return Promise.reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
  return new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(resolve, ms);
    const abort = () => {
      clearTimeout(timeout);
      reject(signal?.reason ?? new DOMException("Aborted", "AbortError"));
    };
    signal?.addEventListener("abort", abort, { once: true });
  });
}

function unmanagedLease(lane: ErmaProviderLane): ProviderLeaseResult {
  return { granted: true, lease: { leaseId: `unmanaged:${crypto.randomUUID()}`, lane, mode: "normal" } };
}

export async function acquireProviderLease(
  candidates: ErmaProviderLane[],
  input: ErmaGenerationInput,
): Promise<ProviderLeaseResult> {
  const namespace = schedulerNamespace();
  if (!namespace) return candidates[0] ? unmanagedLease(candidates[0]) : { granted: false, mode: "survival", retryAfterMs: 1_000 };

  const stub = namespace.getByName("global");
  const requestId = input.requestId?.trim() || crypto.randomUUID();
  const fairnessKey = input.fairnessKey?.trim() || `request:${requestId}`;
  const deadline = Date.now() + admissionWaitMs();

  while (true) {
    const result = await stub.acquire({ candidates, fairnessKey, requestId });
    if (result.granted || Date.now() >= deadline || input.signal?.aborted) return result;
    const remaining = deadline - Date.now();
    await delay(Math.min(Math.max(50, result.retryAfterMs), remaining), input.signal);
  }
}

export async function releaseProviderLease(lease: ProviderLease, outcome: Omit<ProviderLeaseOutcome, "leaseId">) {
  if (lease.leaseId.startsWith("unmanaged:")) return;
  const namespace = schedulerNamespace();
  if (!namespace) return;
  try {
    await namespace.getByName("global").release({ leaseId: lease.leaseId, ...outcome });
  } catch {
    console.warn("inference.scheduler_release_failed", { lane: lease.lane });
  }
}
