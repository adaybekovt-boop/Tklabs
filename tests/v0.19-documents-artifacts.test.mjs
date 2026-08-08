import assert from "node:assert/strict";
import test from "node:test";

import { ARTIFACT_SCHEMA_VERSION } from "../lib/artifacts/types.ts";
import { extractPdfTextFromBytes } from "../lib/documents/extract.ts";

test("v0.19.5 artifact schema advances to v2", () => {
  assert.equal(ARTIFACT_SCHEMA_VERSION, 2);
});

test("v0.19.5 extracts bounded literal text from simple PDF content", () => {
  const source = `%PDF-1.4\n1 0 obj\n<<>>\nstream\nBT /F1 12 Tf (Hello \\(TK LAB\\)) Tj ET\nendstream\nendobj\n%%EOF`;
  const text = extractPdfTextFromBytes(new TextEncoder().encode(source), 200);
  assert.match(text, /Hello \(TK LAB\)/);
  assert.ok(text.length <= 200);
});
