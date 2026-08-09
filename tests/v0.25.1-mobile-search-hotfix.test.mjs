import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import { routeErmaTask } from "../lib/ai/intelligence/router.ts";
import { isContextDependentGroundingTurn } from "../lib/ai/tools/route-tools.ts";

test("v0.25.1 routes explicit search commands to web tools", () => {
  for (const prompt of ["Поищи", "Поищите", "Проверь в интернете", "Search the web", "Look it up"]) {
    const route = routeErmaTask(prompt);
    assert.equal(route.toolClass, "web", prompt);
    assert.equal(route.shouldPlanTools, true, prompt);
    assert.equal(route.shouldCiteSources, true, prompt);
    assert.equal(route.reasonCode, "EXPLICIT_WEB_SEARCH_REQUEST", prompt);
  }
});

test("v0.25.1 treats terse search commands as contextual follow-ups", () => {
  assert.equal(isContextDependentGroundingTurn("Поищи", 3), true);
  assert.equal(isContextDependentGroundingTurn("Look it up", 3), true);
  assert.equal(isContextDependentGroundingTurn("Поищи", 1), false);
});

test("v0.25.1 mobile composer allows attachment popover to paint outside its shell", () => {
  const css = fs.readFileSync("app/mobile-workspace.css", "utf8");
  const composerRule = css.match(/\.chat-composer-area\s*\{([\s\S]*?)\}/)?.[1] ?? "";
  assert.match(composerRule, /overflow:\s*visible/);
  assert.doesNotMatch(composerRule, /contain:\s*layout\s+paint/);
});

test("v0.25.1 production web grounding stays on a free-tier compatible Gemini generation", () => {
  const deploy = fs.readFileSync(".github/workflows/deploy-cloudflare.yml", "utf8");
  assert.match(deploy, /GOOGLE_GROUNDING_MODEL:\s*gemini-2\.5-flash-lite/);
  assert.match(deploy, /GOOGLE_DIRECT_GROUNDING_MODEL:\s*gemini-2\.5-flash/);
  assert.doesNotMatch(deploy, /GOOGLE_(?:DIRECT_)?GROUNDING_MODEL:[^\n]*gemini-3\./);
});
