import { generateWithNvidia, streamWithNvidia } from "./nvidia";
import type {
  ErmaGenerationInput,
  ErmaInferenceProvider,
  ErmaProviderGenerationResult,
  ErmaProviderLane,
} from "./contracts";
import { generateWithGoogle, isGoogleInferenceConfigured, streamWithGoogle } from "./google";
import {
  generateWithOpenAiCompatible,
  isOpenAiCompatibleProviderConfigured,
  streamWithOpenAiCompatible,
} from "./openai-compatible";
import { acquireProviderLease, releaseProviderLease } from "./scheduler";
import { statusFromError } from "./shared";

export class ErmaMeshError extends Error {
  readonly provider: ErmaInferenceProvider | "mesh";
  readonly lane?: ErmaProviderLane;
  readonly status?: number;
  readonly streamed: boolean;
  readonly causeReason: string;

  constructor(input: {
    message: string;
    provider: ErmaInferenceProvider | "mesh";
    lane?: ErmaProviderLane;
    status?: number;
    streamed?: boolean;
    causeReason?: string;
  }) {
    super(input.message);
    this.name = "ErmaMeshError";
    this.provider = input.provider;
    this.lane = input.lane;
    this.status = input.status;
    this.streamed = input.streamed === true;
    this.causeReason = input.causeReason ?? input.message;
  }
}

function meshEnabled() {
  return process.env.ERMA_PROVIDER_MESH_ENABLED?.trim().toLowerCase() !== "false";
}

function nvidiaConfigured() {
  return Boolean(
    process.env.NVIDIA_API_KEY_PRIMARY?.trim()
    || process.env.NVIDIA_API_KEY_SECONDARY?.trim()
    || process.env.NVIDIA_API_KEY_1?.trim()
    || process.env.NVIDIA_API_KEY_2?.trim()
    || process.env.NVIDIA_API_KEY?.trim(),
  );
}

function laneConfigured(lane: ErmaProviderLane) {
  if (lane === "google-fast" || lane === "google-core") return isGoogleInferenceConfigured();
  if (lane === "cerebras") return isOpenAiCompatibleProviderConfigured("cerebras");
  if (lane === "groq") return isOpenAiCompatibleProviderConfigured("groq");
  return nvidiaConfigured();
}

export function candidateProviderLanes(input: ErmaGenerationInput): ErmaProviderLane[] {
  if (!meshEnabled()) return ["nvidia"];

  let candidates: ErmaProviderLane[];
  if (input.images?.length) {
    candidates = ["google-core", "nvidia"];
  } else if (input.model.tier === "heavy") {
    candidates = ["nvidia", "google-core", "cerebras", "groq"];
  } else if (input.requestedReasoning || input.effort === "high") {
    candidates = ["google-core", "nvidia", "cerebras", "groq"];
  } else if (input.model.tier === "light") {
    candidates = ["google-fast", "cerebras", "groq", "nvidia"];
  } else {
    candidates = ["google-core", "cerebras", "nvidia", "groq"];
  }

  const configured = candidates.filter(laneConfigured);
  return configured.length ? configured : ["nvidia"];
}

function providerForLane(lane: ErmaProviderLane): ErmaInferenceProvider {
  if (lane === "google-fast" || lane === "google-core") return "google";
  return lane;
}

function degradedInput(input: ErmaGenerationInput, mode: "normal" | "high" | "survival"): ErmaGenerationInput {
  if (mode === "normal") return input;
  if (mode === "high") {
    return {
      ...input,
      effort: input.effort === "high" ? "medium" : input.effort,
    };
  }
  return {
    ...input,
    requestedReasoning: input.model.tier === "heavy" && input.requestedReasoning,
    effort: input.model.tier === "heavy" ? "medium" : "low",
  };
}

function errorReason(error: unknown) {
  if (error instanceof Error) return error.message;
  return "provider_request_failed";
}

function isAbort(error: unknown, input: ErmaGenerationInput) {
  return input.signal?.aborted === true || (error instanceof DOMException && error.name === "AbortError");
}

function isSafetyFailure(error: unknown) {
  return error instanceof Error && /_output_blocked$/.test(error.message);
}

async function generateOnLane(lane: ErmaProviderLane, input: ErmaGenerationInput): Promise<ErmaProviderGenerationResult> {
  if (lane === "google-fast" || lane === "google-core") return generateWithGoogle(lane, input);
  if (lane === "cerebras" || lane === "groq") return generateWithOpenAiCompatible(lane, input);
  const result = await generateWithNvidia(input);
  return { ...result, provider: "nvidia" };
}

async function streamOnLane(
  lane: ErmaProviderLane,
  input: ErmaGenerationInput,
  onDelta: (delta: string) => void | Promise<void>,
): Promise<ErmaProviderGenerationResult> {
  if (lane === "google-fast" || lane === "google-core") return streamWithGoogle(lane, input, onDelta);
  if (lane === "cerebras" || lane === "groq") return streamWithOpenAiCompatible(lane, input, onDelta);
  const result = await streamWithNvidia(input, onDelta);
  return { ...result, provider: "nvidia" };
}

export async function generateWithErmaMesh(input: ErmaGenerationInput): Promise<ErmaProviderGenerationResult> {
  let remaining = candidateProviderLanes(input);
  const failures: string[] = [];

  while (remaining.length) {
    const admission = await acquireProviderLease(remaining, input);
    if (!admission.granted) {
      throw new ErmaMeshError({ message: "erma_capacity_exhausted", provider: "mesh", causeReason: `capacity_${admission.mode}` });
    }

    const { lease } = admission;
    const provider = providerForLane(lease.lane);
    const startedAt = Date.now();
    try {
      const result = await generateOnLane(lease.lane, degradedInput(input, lease.mode));
      await releaseProviderLease(lease, { ok: true, latencyMs: Date.now() - startedAt });
      return failures.length ? { ...result, fallbackReason: `provider_failover:${failures.join(",")}` } : result;
    } catch (error) {
      const status = statusFromError(error);
      await releaseProviderLease(lease, { ok: false, status, latencyMs: Date.now() - startedAt });
      if (isAbort(error, input)) throw error;
      if (isSafetyFailure(error)) {
        throw new ErmaMeshError({ message: "erma_output_blocked", provider, lane: lease.lane, status, causeReason: errorReason(error) });
      }
      failures.push(`${lease.lane}:${status ?? errorReason(error)}`);
      remaining = remaining.filter((lane) => lane !== lease.lane);
      if (!remaining.length) {
        throw new ErmaMeshError({ message: "erma_mesh_exhausted", provider, lane: lease.lane, status, causeReason: failures.join(";") });
      }
    }
  }

  throw new ErmaMeshError({ message: "erma_mesh_exhausted", provider: "mesh" });
}

export async function streamWithErmaMesh(
  input: ErmaGenerationInput,
  onDelta: (delta: string) => void | Promise<void>,
): Promise<ErmaProviderGenerationResult> {
  let remaining = candidateProviderLanes(input);
  const failures: string[] = [];

  while (remaining.length) {
    const admission = await acquireProviderLease(remaining, input);
    if (!admission.granted) {
      throw new ErmaMeshError({ message: "erma_capacity_exhausted", provider: "mesh", causeReason: `capacity_${admission.mode}` });
    }

    const { lease } = admission;
    const provider = providerForLane(lease.lane);
    const startedAt = Date.now();
    let streamed = false;
    try {
      const result = await streamOnLane(lease.lane, degradedInput(input, lease.mode), async (delta) => {
        streamed = true;
        await onDelta(delta);
      });
      await releaseProviderLease(lease, { ok: true, latencyMs: Date.now() - startedAt });
      return failures.length ? { ...result, fallbackReason: `provider_failover:${failures.join(",")}` } : result;
    } catch (error) {
      const status = statusFromError(error);
      await releaseProviderLease(lease, { ok: false, status, latencyMs: Date.now() - startedAt });
      if (isAbort(error, input)) throw error;
      if (isSafetyFailure(error)) {
        throw new ErmaMeshError({ message: "erma_output_blocked", provider, lane: lease.lane, status, streamed, causeReason: errorReason(error) });
      }
      if (streamed) {
        throw new ErmaMeshError({ message: "erma_stream_interrupted", provider, lane: lease.lane, status, streamed: true, causeReason: errorReason(error) });
      }
      failures.push(`${lease.lane}:${status ?? errorReason(error)}`);
      remaining = remaining.filter((lane) => lane !== lease.lane);
      if (!remaining.length) {
        throw new ErmaMeshError({ message: "erma_mesh_exhausted", provider, lane: lease.lane, status, causeReason: failures.join(";") });
      }
    }
  }

  throw new ErmaMeshError({ message: "erma_mesh_exhausted", provider: "mesh" });
}
