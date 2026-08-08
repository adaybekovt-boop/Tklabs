import type { ErmaIntelligenceRoute } from "@/lib/ai/intelligence/router";
import type { ErmaVerificationResult } from "@/lib/ai/intelligence/verifier";

export function buildAnswerDirective(route: ErmaIntelligenceRoute, verification: ErmaVerificationResult, language: "ru" | "en") {
  const common = [
    "ANSWER INTELLIGENCE:",
    `- Answer in ${language === "ru" ? "Russian" : "English"} unless the user explicitly requests another language.`,
    "- Match depth to the task. Do not add a rigid template to simple conversation.",
    "- Separate evidence-backed facts from estimates, assumptions, and recommendations.",
    "- Never claim a tool/action/test/source was used unless it appears in supplied evidence.",
  ];

  const intent: Record<ErmaIntelligenceRoute["intent"], string[]> = {
    conversation: ["- Respond naturally and directly; tools/citations are unnecessary unless evidence was actually supplied."],
    analysis: ["- Lead with the conclusion, then the strongest reasons, trade-offs, and uncertainty."],
    math: ["- Show the necessary derivation, render math with $...$ inline and $$...$$ for display, and use deterministic tool output for verified results."],
    research: ["- Give a synthesis, key evidence, disagreements/uncertainty, then a compact Sources section using only supplied URLs."],
    fresh_information: ["- State the freshness/date context and cite every material current claim with supplied URLs."],
    tklab_policy: ["- State the current TK LAB rule, practical meaning, boundary/exception, and canonical document version/link when supplied."],
    tklab_release: ["- State exact release versions and distinguish shipped changes from planned/preview work using canonical release evidence."],
    document: ["- Attribute claims to document names/chunk IDs and distinguish extracted text from your interpretation."],
    code: ["- Provide implementation first, then verification status. If sandbox execution did not occur, say the code was not executed."],
    planning: ["- Produce ordered executable stages with dependencies, risks, and a clear completion condition."],
    comparison: ["- Compare on explicit criteria, keep like-for-like facts aligned, and identify where evidence is asymmetric."],
  };

  const verificationLine = verification.status === "verified"
    ? `- Verification: ${verification.code}. Do not broaden this scoped verification beyond the evidence.`
    : verification.status === "not-required"
      ? "- No extra verification was required for this route."
      : `- Verification is ${verification.status} (${verification.code}); explicitly qualify claims that depend on missing evidence.`;

  return [...common, ...intent[route.intent], verificationLine].join("\n");
}
