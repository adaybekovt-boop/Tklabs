import assert from "node:assert/strict";
import test from "node:test";

import { routeErmaTask } from "../lib/ai/intelligence/router.ts";
import { buildKazakhstanVerificationGuard } from "../lib/ai/tools/route-tools.ts";

test("v0.24.2 Kazakhstan current news cannot fall through to model-memory claims", () => {
  const route = routeErmaTask("Какие последние новости Казахстана сегодня?");
  assert.equal(route.intent, "fresh_information");
  assert.match(route.reasonCode, /KAZAKHSTAN/);

  const guard = buildKazakhstanVerificationGuard("ru", route, {
    status: "unverified",
    code: "CURRENT_WEB_EVIDENCE_REQUIRED",
    evidenceCount: 0,
  });
  assert.equal(guard?.reason, "kazakhstan_external_verification_unavailable");
  assert.match(guard?.answer ?? "", /не буду выдавать новости/i);

  assert.equal(buildKazakhstanVerificationGuard("ru", route, {
    status: "verified",
    code: "CURRENT_SOURCE_VERIFIED",
    evidenceCount: 1,
  }), undefined);
});

test("v0.24.2 Kazakhstan current officeholder prompts receive the same fail-safe tag", () => {
  const route = routeErmaTask("Кто сейчас президент Казахстана?");
  assert.equal(route.intent, "fresh_information");
  assert.match(route.reasonCode, /KAZAKHSTAN/);
  const guard = buildKazakhstanVerificationGuard("ru", route, { status: "unverified", code: "CURRENT_WEB_EVIDENCE_REQUIRED", evidenceCount: 0 });
  assert.match(guard?.answer ?? "", /должностных лиц/i);
});
