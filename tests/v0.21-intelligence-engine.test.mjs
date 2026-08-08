import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { buildAnswerDirective } from "../lib/ai/intelligence/answer.ts";
import { searchRequestDocuments } from "../lib/ai/documents/request-index.ts";
import { searchTkLabKnowledge } from "../lib/ai/knowledge/tklab.ts";
import { solveMath } from "../lib/ai/math/engine.ts";
import { routeErmaTask } from "../lib/ai/intelligence/router.ts";
import { verifyErmaEvidence } from "../lib/ai/intelligence/verifier.ts";
import { validatePublicWebUrl } from "../lib/ai/web/gateway.ts";
import { getIntelligenceEngineReleases } from "../lib/intelligence-engine-releases.ts";
import { selectErmaModel } from "../lib/models/server.ts";

async function source(path) { return readFile(path, "utf8"); }

test("v0.21 cognitive router distinguishes canonical, web, document, math, code, and direct chat routes", () => {
  assert.equal(routeErmaTask("Что говорит TK LAB privacy policy о хранении чатов?").intent, "tklab_policy");
  assert.equal(routeErmaTask("Что изменилось в последнем патче Erma?").intent, "tklab_release");
  assert.equal(routeErmaTask("Какие новости NVIDIA сегодня?").intent, "fresh_information");
  assert.equal(routeErmaTask("Разбери прикрепленный PDF и найди риски").intent, "document");
  assert.equal(routeErmaTask("Реши квадратное уравнение x^2-5x+6=0").intent, "math");
  const code = routeErmaTask("Напиши и проверь TypeScript функцию сортировки");
  assert.equal(code.intent, "code");
  assert.equal(code.toolClass, "code");
  assert.equal(code.shouldPlanTools, true);
  assert.equal(routeErmaTask("Привет").intent, "conversation");
  const research = routeErmaTask("Исследуй рынок AI workspace и сравни конкурентов");
  assert.equal(research.intent, "research");
  assert.equal(research.maxToolCalls, 8);
  assert.equal(research.maxToolRounds, 3);
});

test("TK LAB Knowledge Brain searches canonical legal/product/release sources with versions", () => {
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
  assert.throws(() => solveMath("evaluate", { expression: "process.exit()" }));
});

test("document intelligence retrieves relevant request-scoped chunks without a persistent index", () => {
  const documents = [
    { name: "contract.txt", content: `${"General terms. ".repeat(160)}\n\nLiability cap is limited to twelve months of fees. Governing law is Exampleland.` },
    { name: "notes.md", content: "Project notes about design and deployment. No liability language here." },
  ];
  const results = searchRequestDocuments(documents, "liability cap twelve months fees", 5);
  assert.ok(results.length > 0);
  assert.equal(results[0].document, "contract.txt");
  assert.match(results[0].text, /Liability cap/i);
  assert.ok(results.every((entry) => entry.id.includes(entry.document)));
});

test("web gateway rejects literal local/private and unsafe arbitrary targets before fetching", () => {
  assert.equal(validatePublicWebUrl("https://example.com/news").hostname, "example.com");
  assert.throws(() => validatePublicWebUrl("http://127.0.0.1/admin"));
  assert.throws(() => validatePublicWebUrl("http://169.254.169.254/latest/meta-data"));
  assert.throws(() => validatePublicWebUrl("http://192.168.1.20/private"));
  assert.throws(() => validatePublicWebUrl("http://[::1]/admin"));
  assert.throws(() => validatePublicWebUrl("ftp://example.com/file"));
  assert.throws(() => validatePublicWebUrl("https://user:pass@example.com/"));
  assert.throws(() => validatePublicWebUrl("https://example.com:8443/admin"));
});

test("verifier requires opened web sources and scopes math/document/code verification", () => {
  const researchRoute = routeErmaTask("Исследуй рынок AI workspace и сравни конкурентов");
  const searchOnly = verifyErmaEvidence(researchRoute, [{ id: "1", name: "search_web", status: "success", durationMs: 2, summary: "ok" }], [
    { id: "a", kind: "web", title: "A", href: "https://a.example/x", tool: "search_web", trust: "untrusted_external_web" },
    { id: "b", kind: "web", title: "B", href: "https://b.example/x", tool: "search_web", trust: "untrusted_external_web" },
  ]);
  assert.equal(searchOnly.status, "partial");

  const opened = verifyErmaEvidence(researchRoute, [
    { id: "1", name: "open_web_result", status: "success", durationMs: 2, summary: "ok" },
    { id: "2", name: "open_web_result", status: "success", durationMs: 2, summary: "ok" },
  ], [
    { id: "a", kind: "web", title: "A", href: "https://a.example/x", tool: "open_web_result", trust: "untrusted_external_web" },
    { id: "b", kind: "web", title: "B", href: "https://b.example/x", tool: "open_web_result", trust: "untrusted_external_web" },
  ]);
  assert.equal(opened.status, "verified");
  assert.equal(opened.openedWebSources, 2);

  const mathRoute = routeErmaTask("Вычисли 2+2");
  const mathVerified = verifyErmaEvidence(mathRoute, [{ id: "m", name: "solve_math", status: "success", durationMs: 1, summary: "ok" }], [{ id: "m", kind: "math", title: "Math", tool: "solve_math", trust: "deterministic_math_engine" }]);
  assert.equal(mathVerified.code, "DETERMINISTIC_MATH_VERIFIED");
});

test("Erma Auto selects stronger tiers for complex routes while explicit model choice remains stable", () => {
  assert.equal(selectErmaModel("erma-auto", "Привет", { effort: "low" }).tier, "light");
  assert.notEqual(selectErmaModel("erma-auto", "Исследуй рынок AI workspace, сравни конкурентов и подготовь архитектурные рекомендации", { requestedReasoning: true, effort: "high" }).tier, "light");
  assert.equal(selectErmaModel("erma-spark-lite", "Исследуй сложную архитектуру", { requestedReasoning: true, effort: "high" }).key, "erma-spark-lite");
});

test("answer intelligence changes output contract by route and incomplete verification", () => {
  const route = routeErmaTask("Какие новости NVIDIA сегодня?");
  const directive = buildAnswerDirective(route, { status: "partial", code: "CURRENT_SOURCE_FOUND_NOT_OPENED", successfulTools: 1, evidenceCount: 1, independentWebSources: 1, openedWebSources: 0 }, "ru");
  assert.match(directive, /cite every material current claim/i);
  assert.match(directive, /Verification is partial/);
});

test("NVIDIA planner is bounded, search-result scoped, cancellable, and separates trusted control from untrusted evidence", async () => {
  const planner = await source("lib/ai/providers/nvidia-tools.ts");
  const gateway = await source("lib/ai/web/gateway.ts");
  const routeTools = await source("lib/ai/tools/route-tools.ts");
  const registry = await source("lib/ai/tools/registry.ts");
  assert.match(planner, /Cognitive route \(policy, not a suggestion\)/);
  assert.match(planner, /open_web_result; the opener accepts only same-request result IDs/);
  assert.match(planner, /signal: input\.signal/);
  assert.match(planner, /interimVerification\.status === "verified"/);
  assert.match(gateway, /web_result_not_in_session/);
  assert.match(gateway, /redirect: "manual"/);
  assert.match(routeTools, /controlBlock/);
  assert.match(routeTools, /wrapUntrustedExternalText\("intelligence-evidence"/);
  assert.match(routeTools, /wrapUntrustedExternalText\("conversation-memory"/);
  assert.match(registry, /search_tklab_knowledge/);
  assert.match(registry, /search_documents/);
  assert.match(registry, /solve_math/);
  assert.match(registry, /run_code_sandbox/);
});

test("Code Lab has no host eval path and fails closed behind an isolated external sandbox contract", async () => {
  const sandbox = await source("lib/ai/code/sandbox.ts");
  const executor = await source("lib/ai/tools/intelligence-executor.ts");
  const safety = await source("lib/ai-safety.ts");
  assert.doesNotMatch(sandbox, /\beval\s*\(|new\s+Function\s*\(/);
  assert.match(sandbox, /code_sandbox_not_configured/);
  assert.match(sandbox, /network:\s*false/);
  assert.match(sandbox, /filesystem:\s*"temporary"/);
  assert.match(executor, /code_sandbox_not_allowed/);
  assert.match(safety, /Never execute user code on the TK LAB application host/);
});

test("LaTeX rendering is wired through remark-math, rehype-katex, and bundled KaTeX CSS", async () => {
  const markdown = await source("components/playground/MarkdownMessage.tsx");
  const layout = await source("app/layout.tsx");
  const packageJson = JSON.parse(await source("package.json"));
  assert.match(markdown, /remarkMath/);
  assert.match(markdown, /rehypeKatex/);
  assert.match(layout, /katex\/dist\/katex\.min\.css/);
  assert.ok(packageJson.dependencies.katex);
  assert.ok(packageJson.dependencies["remark-math"]);
  assert.ok(packageJson.dependencies["rehype-katex"]);
});

test("all sixteen v0.21 release stages remain synchronized as historical release data", async () => {
  const ru = getIntelligenceEngineReleases("ru");
  const en = getIntelligenceEngineReleases("en");
  const expected = Array.from({ length: 16 }, (_, index) => `v0.21.${index}`);
  assert.deepEqual(ru.map((entry) => entry.version), expected);
  assert.deepEqual(en.map((entry) => entry.version), expected);
  assert.equal(ru.at(-1)?.title, "Erma Intelligence Engine — Quality Gate");
  assert.equal(en.at(-1)?.title, "Erma Intelligence Engine — Quality Gate");

  const packageJson = JSON.parse(await source("package.json"));
  const packageLock = JSON.parse(await source("package-lock.json"));
  const patchNotes = await source("app/patch-notes/page.tsx");
  const historicalRelease = await source("docs/releases/v0.21.15.md");
  assert.equal(packageJson.version, packageLock.version);
  assert.equal(packageJson.version, packageLock.packages[""].version);
  assert.ok(packageLock.packages["node_modules/katex"]);
  assert.match(patchNotes, /getIntelligenceEngineReleases/);
  assert.match(historicalRelease, /v0\.21\.15/);
  assert.match(historicalRelease, /Erma Intelligence Engine/);
  assert.match(historicalRelease, /BRAVE_SEARCH_API_KEY/);
  assert.match(historicalRelease, /CODE_SANDBOX_URL/);
});

test("new layered memory explicitly remains request-context-only", async () => {
  const memory = await source("lib/ai/intelligence/memory.ts");
  const release = await source("docs/releases/v0.21.15.md");
  assert.match(memory, /persistence:\s*"request-context-only"/);
  assert.match(release, /request-context-only/);
  assert.match(release, /Local\/Synced\/Ephemeral/);
});