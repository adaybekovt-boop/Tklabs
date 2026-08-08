import type { AiProvenance, AiProvider, AiResponseMeta } from "@/lib/ai/types";
import { CURRENT_RELEASE_VERSION } from "@/lib/release-version";
import { AI_POLICY_VERSION } from "@/lib/policy-registry";

export function createAiProvenance(input: { requestedModel: string; actualProvider: AiProvider; generatedAt?: Date }): AiProvenance {
  return { schemaVersion: 1, aiGenerated: true, tkLabVersion: CURRENT_RELEASE_VERSION, policyVersion: AI_POLICY_VERSION, generatedAt: (input.generatedAt ?? new Date()).toISOString(), providerClass: input.actualProvider === "edge-fallback" ? "local-fallback" : "external-model-provider", productModel: input.requestedModel, actualProvider: input.actualProvider, humanEdited: false };
}

export type ProvenanceEnvelope = { schema: "tklab.ai-artifact.v1"; content: string; provenance: AiProvenance & { humanEdited: boolean }; requestId: string };
export function createProvenanceEnvelope(content: string, meta: AiResponseMeta, humanEdited = false): ProvenanceEnvelope {
  const provenance = meta.provenance ?? createAiProvenance({ requestedModel: meta.requestedModel, actualProvider: meta.actualProvider });
  return { schema: "tklab.ai-artifact.v1", content, provenance: { ...provenance, humanEdited }, requestId: meta.requestId };
}
