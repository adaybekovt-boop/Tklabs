import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { neutralizeProviderBranding } from "../lib/public-branding.ts";
import { CLODEX_MODELS } from "../lib/models/clodex-public.ts";

test("legacy provider copy is neutralized for product surfaces", () => {
  assert.equal(
    neutralizeProviderBranding("Clodex is available at /api/clodex."),
    "External API is available at /api/external-api.",
  );
  assert.equal(neutralizeProviderBranding("CLODEX / clodex"), "External API / External API");
});

test("public provider model labels no longer expose the legacy name", () => {
  assert.equal(CLODEX_MODELS.length, 3);
  for (const model of CLODEX_MODELS) {
    assert.match(model.name, /^External API/);
    assert.doesNotMatch(model.name, /clodex/i);
  }
});

test("neutral API route exists and product branding is applied globally", async () => {
  const [route, layout, branding, serverModels] = await Promise.all([
    readFile(new URL("../app/api/external-api/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/public-branding.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/models/clodex-server.ts", import.meta.url), "utf8"),
  ]);

  assert.match(route, /app\/api\/clodex\/route/);
  assert.match(layout, /lib\/public-branding/);
  assert.match(branding, /MutationObserver/);
  assert.doesNotMatch(serverModels, /name:\s*"Clodex/i);
  assert.match(serverModels, /name:\s*"External API/);
});
