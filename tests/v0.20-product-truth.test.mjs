import assert from "node:assert/strict";
import test from "node:test";

import { PRODUCT_DATA_ROUTES, PRODUCT_FACTS, PRODUCT_FACTS_VERSION, PRODUCT_POSITIONING } from "../lib/product-facts.ts";

test("v0.20 product truth registry describes real storage and provider boundaries", () => {
  assert.equal(PRODUCT_FACTS_VERSION, "2026-08-08");
  assert.match(PRODUCT_POSITIONING.en, /local-first/i);
  assert.equal(PRODUCT_FACTS.localArchive.default, true);
  assert.equal(PRODUCT_FACTS.workspaceSync.optional, true);
  assert.equal(PRODUCT_FACTS.workspaceSync.automatic, false);
  assert.equal(PRODUCT_FACTS.workspaceSync.endToEndEncrypted, false);
  assert.equal(PRODUCT_FACTS.providerProcessing.promptLeavesDevice, true);
  assert.deepEqual(PRODUCT_FACTS.files.accepted, ["txt", "md", "csv", "json", "pdf"]);
});

test("privacy modes never claim on-device inference", () => {
  const ephemeral = PRODUCT_DATA_ROUTES.find((entry) => entry.storageMode === "ephemeral");
  assert.ok(ephemeral);
  assert.deepEqual(ephemeral.route, ["device", "TK LAB Worker", "external model provider"]);
  assert.match(ephemeral.note.en, /provider transmission/i);
});
