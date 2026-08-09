import type {
  ErmaProviderLane,
  ProviderLeaseOutcome,
  ProviderLeaseResult,
} from "@/lib/ai/providers/contracts";

export type InferenceAcquireInput = {
  candidates: ErmaProviderLane[];
  fairnessKey: string;
  requestId: string;
  estimatedTokens: number;
};

export type InferenceSchedulerStub = {
  acquire(input: InferenceAcquireInput): Promise<ProviderLeaseResult>;
  release(outcome: ProviderLeaseOutcome): Promise<void>;
};

export type InferenceSchedulerNamespace = {
  getByName(name: string): InferenceSchedulerStub;
};
