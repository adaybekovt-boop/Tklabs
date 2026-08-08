import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("mobile public chrome relies on the persistent bottom navigation", async () => {
  const [header, mobileNavigation, home, login] = await Promise.all([
    read("components/site/StitchHeader.tsx"),
    read("components/site/MobileNavigation.tsx"),
    read("app/page.tsx"),
    read("app/login/page.tsx"),
  ]);

  assert.match(header, /hidden border-b[\s\S]*lg:block/);
  assert.match(header, /<MobileNavigation/);
  assert.match(mobileNavigation, /fixed inset-x-0 bottom-0/);
  assert.match(mobileNavigation, /data-testid="mobile-bottom-navigation"/);
  assert.doesNotMatch(home, /Начать новый диалог|Start a new conversation/);
  assert.match(home, /hidden pt-4 sm:flex/);
  assert.match(login, /<StitchHeader \/>/);
  assert.match(login, /\/legal\/terms/);
  assert.match(login, /\/legal\/privacy/);
  assert.match(login, /\/supported-countries/);
  assert.doesNotMatch(login, /FlowButton/);
});

test("terms consent fails closed for stale clients and stays above navigation", async () => {
  const gate = await read("components/legal/TermsGate.tsx");

  assert.match(gate, /payload\.currentVersion !== CURRENT_TERMS_VERSION/);
  assert.match(gate, /setVersionConflict\(true\)/);
  assert.match(gate, /window\.location\.reload\(\)/);
  assert.match(gate, /response\.status === 409/);
  assert.match(gate, /z-\[200\]/);
  assert.match(gate, /data-terms-gate/);
  assert.match(gate, /setChecked\(false\)/);
});

test("navigation motion is progressive and respects reduced motion", async () => {
  const [orchestrator, transition, css, layout] = await Promise.all([
    read("components/site/MotionOrchestrator.tsx"),
    read("components/site/useRouteTransition.ts"),
    read("app/navigation-polish.css"),
    read("app/layout.tsx"),
  ]);

  assert.match(orchestrator, /data\.routeLeaving/);
  assert.match(orchestrator, /data\.routeEntering/);
  assert.match(orchestrator, /prefers-reduced-motion: reduce/);
  assert.match(transition, /startViewTransition/);
  assert.match(transition, /prefers-reduced-motion: reduce/);
  assert.match(css, /\[data-testid="mobile-bottom-navigation"\]/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(layout, /navigation-polish\.css/);
});

test("documentation exposes product, trust, and access references", async () => {
  const [page, guide] = await Promise.all([
    read("app/documentation/page.tsx"),
    read("docs/navigation-legal-ux.md"),
  ]);

  for (const href of ["/playground", "/models", "/patch-notes", "/status", "/legal/terms", "/legal/privacy", "/supported-countries"]) {
    assert.ok(page.includes(href), `documentation should link to ${href}`);
  }
  assert.match(page, /Trust and policy|Доверие и правила/);
  assert.match(guide, /fail-closed/i);
  assert.match(guide, /persistent bottom navigation/i);
});
