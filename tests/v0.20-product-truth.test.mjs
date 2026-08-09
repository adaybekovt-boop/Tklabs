import assert from "node:assert/strict";
import test from "node:test";

import { PRODUCT_DATA_ROUTES, PRODUCT_FACTS, PRODUCT_FACTS_VERSION, PRODUCT_POSITIONING } from "../lib/product-facts.ts";

test("v0.20 product truth registry describes real storage and provider boundaries", () => {
  assert.equal(PRODUCT_FACTS_VERSION, "2026-08-09");
  assert.match(PRODUCT_POSITIONING.en, /local-first/i);
  assert.equal(PRODUCT_FACTS.localArchive.default, true);
  assert.equal(PRODUCT_FACTS.workspaceSync.optional, true);
  assert.equal(PRODUCT_FACTS.workspaceSync.automatic, false);
  assert.equal(PRODUCT_FACTS.workspaceSync.endToEndEncrypted, false);
  assert.equal(PRODUCT_FACTS.providerProcessing.promptLeavesDevice, true);
  for (const format of ["txt", "md", "csv", "json", "pdf"]) assert.ok(PRODUCT_FACTS.files.accepted.includes(format));
});

test("later multimodal and grounding releases can extend product truth without changing the v0.20 storage contract", () => {
  for (const format of ["jpg", "jpeg", "png", "webp"]) assert.ok(PRODUCT_FACTS.files.accepted.includes(format));
  assert.equal(PRODUCT_FACTS.files.imageUnderstanding, "external-multimodal-model-provider");
  assert.equal(PRODUCT_FACTS.ai.imageRouting, "automatic-hidden-vision-tier");
  assert.equal(PRODUCT_FACTS.webGrounding.directGoogleGroundedAnswers, true);
  assert.equal(PRODUCT_FACTS.webGrounding.directGoogleAnswerRewrittenByErma, false);
  assert.equal(PRODUCT_FACTS.webGrounding.fullConversationSentToSearchProvider, false);
});

test("privacy modes never claim on-device inference", () => {
  const ephemeral = PRODUCT_DATA_ROUTES.find((entry) => entry.id === "ai-generation");
  assert.ok(ephemeral);
  assert.deepEqual(ephemeral.route, ["device", "TK LAB Worker", "external model provider"]);
  assert.match(ephemeral.note.en, /provider transmission/i);
});