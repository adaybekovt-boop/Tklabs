import { readFile } from "node:fs/promises";

const [facts, legal, policy, safety, privacyRoute, syncRoute, releases, patchNotes] = await Promise.all([
  readFile("lib/product-facts.ts", "utf8"),
  readFile("lib/legal-documents.ts", "utf8"),
  readFile("lib/policy-registry.ts", "utf8"),
  readFile("lib/ai-safety.ts", "utf8"),
  readFile("app/api/account/privacy/route.ts", "utf8"),
  readFile("app/api/account/workspace-sync/route.ts", "utf8"),
  readFile("lib/trust-architecture-releases.ts", "utf8"),
  readFile("app/patch-notes/page.tsx", "utf8"),
]);

const failures = [];
function requireMatch(source, pattern, message) { if (!pattern.test(source)) failures.push(message); }

requireMatch(facts, /endToEndEncrypted:\s*false/, "Product facts must not call Workspace Sync end-to-end encrypted");
requireMatch(facts, /promptLeavesDevice:\s*true/, "Product facts must disclose provider transmission");
requireMatch(legal, /CURRENT_LEGAL_BUNDLE_VERSION/, "Legal bundle version missing");
requireMatch(policy, /high-impact/, "High-impact policy category missing");
requireMatch(safety, /POLICY_RULES/, "Runtime safety must import/use the shared policy registry");
requireMatch(privacyRoute, /export async function DELETE/, "Account privacy delete route missing");
requireMatch(syncRoute, /export async function DELETE/, "Workspace Sync delete route missing");
requireMatch(patchNotes, /getTrustArchitectureReleases/, "Updates page is not wired to Trust Architecture releases");
for (let patch = 0; patch <= 9; patch += 1) requireMatch(releases, new RegExp(`version: \\"v0\\.20\\.${patch}\\"`), `Updates entry v0.20.${patch} missing`);

if (process.env.TKLABS_COMMERCIAL_LAUNCH === "true") {
  for (const key of ["NEXT_PUBLIC_TKLAB_OPERATOR_NAME", "NEXT_PUBLIC_TKLAB_LEGAL_CONTACT", "NEXT_PUBLIC_TKLAB_JURISDICTION"]) {
    if (!process.env[key]?.trim()) failures.push(`Commercial launch requires ${key}`);
  }
}

if (failures.length) { console.error("Trust consistency failed:\n" + failures.map((item) => `- ${item}`).join("\n")); process.exit(1); }
console.log("Trust consistency passed.");
