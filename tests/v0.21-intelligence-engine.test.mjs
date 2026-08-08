import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { routeErmaTask } from "../lib/ai/intelligence/router.ts";
import { searchTkLabKnowledge } from "../lib/ai/knowledge/tklab.ts";
import { solveMath } from "../lib/ai/math/engine.ts";
import { validatePublicWebUrl } from "../lib/ai/web/gateway.ts";

async function source(path) { return readFile(path, "utf8"); }

test("v0.21 cognitive router distinguishes source-of-truth, fresh web, math, and direct chat", () => {
  assert.equal(routeErmaTask("Что говорит TK LAB privacy policy о хранении чатов?").intent, "tklab_policy");
  assert.equal(routeErmaTask("Что изменилось в последнем патче Erma?").intent, "tklab_release");
  assert.equal(routeErmaTask("Какие новости NVIDIA сегодня?").intent, "fresh_information");
  assert.equal(routeErmaTask("Реши квадратное уравнение x^2-5x+6=0").intent, "math");
  assert.equal(routeErmaTask("Привет").intent, "conversation");
  assert.equal(routeErmaTask("Исследуй рынок AI workspace и сравни конкурентов").maxToolCalls, 8);
});

test("TK LAB Knowledge Brain searches canonical legal/product/release sources", () => {
  const privacy = searchTkLabKnowledge("ru", "Workspace Sync end-to-end шифрование", ["legal", "product"], 8);
  assert.ok(privacy.length > 0);
  assert.ok(privacy.some((entry) => entry.href === "/legal/privacy" || entry.href === "/truth"));
  assert.ok(privacy.every((entry) => entry.version));

  const releases = searchTkLabKnowledge("en", "Mobile Fixed Layers", ["release"], 5);
  assert.ok(releases.some((entry) => entry.id.includes("v0.20.10")));
});

test("deterministic math engine verifies arithmetic, quadratics, statistics, determinant, and polynomials", () => {
  assert.equal(solveMath("evaluate", { expression: "(12+3)*4" }).value, 60);
  assert.deepEqual(solveMath("quadratic", { a: 1, b: -5, c: 6 }).roots, [3, 2]);
  assert.equal(solveMath("statistics", { values: [1, 2, 3, 4] }).mean, 2.5);
  assert.equal(solveMath("determinant", { matrix: [[1, 2], [3, 4]] }).determinant, -2);
  assert.equal(solveMath("derivative", { expression: "3x^2-2x+5" }).result, "6x-2");
  assert.match(solveMath("integral", { expression: "6x-2" }).latex, /\\int/);
});

test("web gateway rejects local/private/arbitrary unsafe targets before fetching", () => {
  assert.equal(validatePublicWebUrl("https://example.com/news").hostname, "example.com");
  assert.throws(() => validatePublicWebUrl("http://127.0.0.1/admin"));
  assert.throws(() => validatePublicWebUrl("http://169.254.169.254/latest/meta-data"));
  assert.throws(() => validatePublicWebUrl("ftp://example.com/file"));
  assert.throws(() => validatePublicWebUrl("https://user:pass@example.com/"));
});

test("NVIDIA planner is route-bounded and only opens URLs returned by web search", async () => {
  const planner = await source("lib/ai/providers/nvidia-tools.ts");
  const gateway = await source("lib/ai/web/gateway.ts");
  const registry = await source("lib/ai/tools/registry.ts");
  assert.match(planner, /Cognitive route \(policy, not a suggestion\)/);
  assert.match(planner, /open_web_result accepts only an ID returned by search_web/);
  assert.match(gateway, /web_result_not_in_session/);
  assert.match(gateway, /redirect: "manual"/);
  assert.match(registry, /search_tklab_knowledge/);
  assert.match(registry, /solve_math/);
});
