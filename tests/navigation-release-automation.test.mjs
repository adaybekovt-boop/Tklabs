import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("public navigation uses one persistent application dock", async () => {
  const [dock, header, home, login] = await Promise.all([
    source("components/site/AppDock.tsx"),
    source("components/site/StitchHeader.tsx"),
    source("app/page.tsx"),
    source("app/login/page.tsx"),
  ]);

  assert.match(dock, /data-app-dock/);
  assert.match(dock, /fixed inset-x-2 bottom-2/);
  assert.match(dock, /href: "\/playground"/);
  assert.match(header, /<AppDock /);
  assert.doesNotMatch(header, /<GlowNav /);
  assert.doesNotMatch(header, /<MobileNavigation /);
  assert.doesNotMatch(home, /FlowButton href="\/playground"/);
  assert.doesNotMatch(home, /Начать новый диалог|Start a new conversation/);
  assert.match(login, /<StitchHeader \/>/);
  assert.doesNotMatch(login, /FlowButton/);
});

test("navigation transitions keep the dock anchored and respect reduced motion", async () => {
  const [orchestrator, css] = await Promise.all([
    source("components/site/MotionOrchestrator.tsx"),
    source("app/navigation-motion.css"),
  ]);

  assert.match(orchestrator, /routeTransition = "leaving"/);
  assert.match(orchestrator, /routeTransition = "entering"/);
  assert.match(orchestrator, /next\.origin !== window\.location\.origin/);
  assert.match(css, /data-route-transition="leaving"/);
  assert.match(css, /data-app-dock/);
  assert.match(css, /prefers-reduced-motion: reduce/);
});

test("terms gate fails closed on version skew and stays above navigation", async () => {
  const termsGate = await source("components/legal/TermsGate.tsx");

  assert.match(termsGate, /payload\.currentVersion !== CURRENT_TERMS_VERSION/);
  assert.match(termsGate, /setOpen\(true\)/);
  assert.match(termsGate, /response\.status === 409/);
  assert.match(termsGate, /z-\[220\]/);
  assert.match(termsGate, /data-terms-gate/);
});

test("release notes are drafted automatically with stable categories and a pinned action", async () => {
  const [config, workflow, docs] = await Promise.all([
    source(".github/release-drafter.yml"),
    source(".github/workflows/release-drafter.yml"),
    source("docs/RELEASE_NOTES_AUTOMATION.md"),
  ]);

  for (const heading of ["Security", "Hot Fixes", "Features", "Interface", "Documentation", "Dependencies", "Maintenance"]) {
    assert.match(config, new RegExp(heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(config, /name-template: "TK LAB v\$RESOLVED_VERSION"/);
  assert.match(config, /autolabeler:/);
  assert.match(workflow, /release-drafter\/release-drafter@34d80673e067bdc0c24568d3af899c216adcfaa9/);
  assert.match(workflow, /release-drafter\/release-drafter\/autolabeler@34d80673e067bdc0c24568d3af899c216adcfaa9/);
  assert.match(docs, /GitHub Releases is the canonical source/);
});
