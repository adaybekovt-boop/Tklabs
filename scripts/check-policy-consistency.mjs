import { readFile } from "node:fs/promises";

const [policy, safety, legalPage, chatPrompt, tools] = await Promise.all([readFile("lib/policy-registry.ts", "utf8"), readFile("lib/ai-safety.ts", "utf8"), readFile("app/legal/[doc]/page.tsx", "utf8"), readFile("lib/chat-prompt.ts", "utf8"), readFile("lib/ai/tools/route-tools.ts", "utf8")]);
const failures = [];
for (const category of ["allowed", "restricted", "high-impact", "harmful", "prompt-injection", "secret-extraction"]) if (!policy.includes(`\"${category}\"`)) failures.push(`Missing policy category ${category}`);
if (!safety.includes("POLICY_RULES")) failures.push("Runtime safety is detached from policy registry");
if (!legalPage.includes("getAcceptableUseDocument")) failures.push("Public Acceptable Use is detached from policy registry");
if (!chatPrompt.includes("wrapUntrustedExternalText")) failures.push("Attachments are not explicitly untrusted");
if (!tools.includes("wrapUntrustedExternalText")) failures.push("Tool output is not explicitly untrusted");
if (failures.length) { console.error("Policy consistency failed:\n" + failures.map((item) => `- ${item}`).join("\n")); process.exit(1); }
console.log("Policy consistency passed.");
