import assert from "node:assert/strict";
import test from "node:test";

import { createAiResponseMeta } from "../lib/ai/response.ts";
import { createProvenanceEnvelope } from "../lib/ai/provenance.ts";
import { getModelCards } from "../lib/model-cards.ts";

test("AI response metadata contains safe provenance without hidden reasoning", () => { const meta = createAiResponseMeta({ answer: "ok", provider: "nvidia", actualModel: "provider/model", reasoningUsed: true }, "Erma Core", "req-1", 1000, 200, 1200); assert.equal(meta.provenance?.aiGenerated, true); assert.equal(meta.provenance?.productModel, "Erma Core"); assert.equal(meta.provenance?.providerClass, "external-model-provider"); assert.equal("reasoning" in (meta.provenance ?? {}), false); const envelope = createProvenanceEnvelope("answer", meta, true); assert.equal(envelope.provenance.humanEdited, true); });
test("model cards disclose provider and data handling for every public Erma tier", () => { const cards = getModelCards("en"); assert.deepEqual(cards.map((card) => card.name), ["Erma Lite", "Erma Core", "Erma Pro"]); for (const card of cards) { assert.match(card.providerClass, /External/); assert.ok(card.dataHandling.length > 20); } });
