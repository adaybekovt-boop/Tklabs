import type { ErmaEvidence } from "@/lib/ai/intelligence/evidence";
import type { ErmaIntelligenceRoute } from "@/lib/ai/intelligence/router";
import type { AiToolCallTrace } from "@/lib/ai/types";

export type ErmaVerificationStatus = "not-required" | "verified" | "partial" | "unverified";
export type ErmaVerificationResult = {
  status: ErmaVerificationStatus;
  code: string;
  successfulTools: number;
  evidenceCount: number;
  independentWebSources: number;
};

function successful(traces: readonly AiToolCallTrace[]) {
  return traces.filter((trace) => trace.status === "success");
}

function webHosts(evidence: readonly ErmaEvidence[]) {
  const hosts = new Set<string>();
  for (const entry of evidence) {
    if (entry.kind !== "web" || !entry.href) continue;
    try { hosts.add(new URL(entry.href).hostname.toLowerCase()); } catch { /* ignore malformed evidence */ }
  }
  return hosts;
}

export function verifyErmaEvidence(route: ErmaIntelligenceRoute, traces: readonly AiToolCallTrace[], evidence: readonly ErmaEvidence[]): ErmaVerificationResult {
  const tools = successful(traces);
  const hosts = webHosts(evidence);
  const base = { successfulTools: tools.length, evidenceCount: evidence.length, independentWebSources: hosts.size };

  if (route.verification === "normal") return { status: "not-required", code: "NO_EXTRA_VERIFICATION_REQUIRED", ...base };

  if (route.verification === "verify-calculation") {
    const checked = tools.some((trace) => trace.name === "solve_math" || trace.name === "calculate") && evidence.some((item) => item.kind === "math");
    return checked ? { status: "verified", code: "DETERMINISTIC_MATH_VERIFIED", ...base } : { status: "unverified", code: "MATH_TOOL_REQUIRED", ...base };
  }

  if (route.intent === "tklab_policy" || route.intent === "tklab_release") {
    const canonical = evidence.some((item) => item.kind === "tklab") || tools.some((trace) => trace.name === "search_patch_notes");
    return canonical ? { status: "verified", code: "TKLAB_CANONICAL_SOURCE_VERIFIED", ...base } : { status: "unverified", code: "TKLAB_SOURCE_OF_TRUTH_REQUIRED", ...base };
  }

  if (route.intent === "research") {
    if (hosts.size >= 2) return { status: "verified", code: "MULTI_SOURCE_WEB_VERIFIED", ...base };
    if (hosts.size === 1) return { status: "partial", code: "RESEARCH_SINGLE_SOURCE_ONLY", ...base };
    return { status: "unverified", code: "RESEARCH_EVIDENCE_REQUIRED", ...base };
  }

  if (route.freshness === "web-current") {
    if (hosts.size >= 1) return { status: "verified", code: "CURRENT_WEB_SOURCE_VERIFIED", ...base };
    return { status: "unverified", code: "CURRENT_SOURCE_REQUIRED", ...base };
  }

  if (route.verification === "verify-tools") return tools.length > 0
    ? { status: "verified", code: "TOOL_CHECK_COMPLETED", ...base }
    : { status: "partial", code: "MODEL_REASONING_NOT_TOOL_VERIFIED", ...base };

  return { status: evidence.length ? "verified" : "unverified", code: evidence.length ? "EVIDENCE_PRESENT" : "EVIDENCE_REQUIRED", ...base };
}

export function verificationPromptBlock(result: ErmaVerificationResult) {
  return [
    "VERIFICATION STATUS:",
    `- status: ${result.status}`,
    `- code: ${result.code}`,
    `- evidence count: ${result.evidenceCount}`,
    `- independent web sources: ${result.independentWebSources}`,
    result.status === "verified"
      ? "Use the verified evidence for factual claims."
      : "Do not present unverified current/source-dependent claims as certain. State the limitation succinctly.",
  ].join("\n");
}
