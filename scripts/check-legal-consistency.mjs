import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const [legal, terms, policy, consent, route, schema, migration] = await Promise.all([
  readFile("lib/legal-documents.ts", "utf8"),
  readFile("lib/terms.ts", "utf8"),
  readFile("lib/policy-registry.ts", "utf8"),
  readFile("lib/terms-consent.ts", "utf8"),
  readFile("app/api/account/terms/route.ts", "utf8"),
  readFile("db/schema.ts", "utf8"),
  readFile("drizzle/0002_legal_acceptances.sql", "utf8"),
]);

const failures = [];
const digestMatch = legal.match(/CURRENT_LEGAL_BUNDLE_DIGEST\s*=\s*"([a-f0-9]{64})"/);
if (!digestMatch) failures.push("Legal bundle digest must be a 64-char hex digest");
else {
  const normalizedLegal = legal.replace(/CURRENT_LEGAL_BUNDLE_DIGEST\s*=\s*"[a-f0-9]{64}"/, 'CURRENT_LEGAL_BUNDLE_DIGEST = "<CONTENT_DIGEST>"');
  const calculated = createHash("sha256").update([terms, normalizedLegal, policy].join("\n---TKLAB-LEGAL-BUNDLE---\n")).digest("hex");
  if (digestMatch[1] !== calculated) failures.push(`Legal bundle digest mismatch: expected ${calculated}, found ${digestMatch[1]}`);
}
if (!consent.includes("db.insert(legalAcceptances)")) failures.push("Acceptance ledger append missing");
if (!consent.includes("CURRENT_LEGAL_BUNDLE_DIGEST")) failures.push("Acceptance evidence is not bound to legal digest");
if (!consent.includes("workspaceSnapshots") || !consent.includes("auditEvents")) failures.push("Legacy user-id backfill does not preserve linked trust data");
if (!route.includes("CURRENT_LEGAL_BUNDLE_VERSION")) failures.push("Terms route does not reject stale bundle versions");
if (!schema.includes("legalAcceptances") || !migration.includes("legal_acceptances")) failures.push("D1 legal acceptance schema/migration missing");
if (failures.length) { console.error("Legal consistency failed:\n" + failures.map((item) => `- ${item}`).join("\n")); process.exit(1); }
console.log("Legal consistency passed.");
