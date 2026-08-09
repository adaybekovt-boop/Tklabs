import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { CURRENT_LEGAL_BUNDLE_DIGEST, CURRENT_LEGAL_BUNDLE_VERSION, LEGAL_DOCUMENT_MANIFEST, getLegalDocument } from "../lib/legal-documents.ts";

test("v0.20 legal bundle is versioned and covers trust documents", () => {
  assert.match(CURRENT_LEGAL_BUNDLE_VERSION, /^\d{4}-\d{2}-\d{2}(?:\.\d+)?$/);
  assert.match(CURRENT_LEGAL_BUNDLE_DIGEST, /^[a-f0-9]{64}$/);
  assert.deepEqual(LEGAL_DOCUMENT_MANIFEST.map((entry) => entry.slug), ["terms", "privacy", "acceptable-use", "ai-transparency", "subprocessors", "security"]);
  assert.ok(LEGAL_DOCUMENT_MANIFEST.filter((entry) => entry.slug !== "terms").every((entry) => entry.version === CURRENT_LEGAL_BUNDLE_VERSION));
  assert.match(getLegalDocument("en", "privacy").sections.map((section) => section.paragraphs.join(" ")).join(" "), /not end-to-end encryption/i);
});

test("acceptance ledger is append-only evidence in D1 schema", async () => {
  const schema = await readFile("db/schema.ts", "utf8");
  const consent = await readFile("lib/terms-consent.ts", "utf8");
  assert.match(schema, /legalAcceptances/);
  assert.match(schema, /bundleDigest/);
  assert.match(consent, /crypto\.randomUUID\(\)/);
  assert.match(consent, /db\.insert\(legalAcceptances\)/);
});
