import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) {
  return readFile(path, "utf8");
}

test("TermsGate is a body-level viewport layer with independently scrolling legal content", async () => {
  const terms = await source("components/legal/TermsGate.tsx");
  assert.match(terms, /createPortal\(gate, document\.body\)/);
  assert.match(terms, /h-\[100dvh\]/);
  assert.match(terms, /data-terms-gate-scroll/);
  assert.match(terms, /data-terms-gate-actions/);
  assert.match(terms, /lockDocumentScroll\(\)/);
});

test("public and workspace navigation are body-level fixed layers with stable viewport anchors", async () => {
  const appDock = await source("components/site/AppDock.tsx");
  const workspaceDock = await source("components/playground/MobileWorkspaceSwitcher.tsx");
  const mobileCss = await source("app/mobile-workspace.css");
  const navigationMotion = await source("app/navigation-motion.css");

  assert.match(appDock, /data-app-dock/);
  assert.match(appDock, /createPortal\(/);
  assert.match(appDock, /document\.body/);
  assert.match(workspaceDock, /data-mobile-workspace-switcher/);
  assert.match(workspaceDock, /createPortal\(/);
  assert.match(workspaceDock, /document\.body/);
  assert.match(mobileCss, /\.mobile-workspace-switcher\s*\{[\s\S]*?position:\s*fixed/);
  assert.match(mobileCss, /padding-bottom:\s*var\(--mobile-workspace-dock-height\)/);

  const anchorRule = navigationMotion.match(/\[data-app-dock\]\s*\{([\s\S]*?)\}/)?.[1] ?? "";
  assert.ok(anchorRule, "AppDock anchor rule must exist");
  assert.doesNotMatch(anchorRule, /transform\s*:/, "the fixed AppDock anchor must never be transformed");
  assert.match(navigationMotion, /\[data-app-dock\] > div\s*\{[\s\S]*?app-dock-content-enter/);
});

test("document-level motion cannot become the containing block for fixed mobile layers", async () => {
  const navigationMotion = await source("app/navigation-motion.css");

  assert.match(navigationMotion, /html\[data-motion="ready"\] body\s*\{[\s\S]*?animation-name:\s*viewport-safe-page-enter/);
  assert.match(navigationMotion, /@keyframes viewport-safe-page-enter\s*\{[\s\S]*?opacity:\s*0;[\s\S]*?opacity:\s*1;[\s\S]*?\}/);
  const safeKeyframes = navigationMotion.match(/@keyframes viewport-safe-page-enter\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";
  assert.doesNotMatch(safeKeyframes, /transform\s*:/, "page-entry animation must not transform body");
  assert.match(navigationMotion, /html\[data-route-transition="true"\] body\s*\{[\s\S]*?transform:\s*none/);
});

test("blocking mobile sheets share document scroll locking and explicit layer order", async () => {
  const overlay = await source("components/playground/ChatOverlay.tsx");
  const drawer = await source("components/playground/MobileChatDrawer.tsx");
  const appDock = await source("components/site/AppDock.tsx");
  const terms = await source("components/legal/TermsGate.tsx");

  assert.match(overlay, /lockDocumentScroll\(\)/);
  assert.match(drawer, /lockDocumentScroll\(\)/);
  assert.match(appDock, /z-\[120\]/);
  assert.match(overlay, /z-\[180\]/);
  assert.match(drawer, /z-\[190\]/);
  assert.match(terms, /z-\[220\]/);
});

test("Browser Assurance reproduces tall-page consent and pinned navigation failures", async () => {
  const harness = await source("app/browser-assurance/terms/page.tsx");
  const browser = await source("e2e/playground.spec.mjs");

  assert.match(harness, /min-h-\[300dvh\]/);
  assert.match(harness, /<TermsGate enabled locale=\{locale\}/);
  assert.match(browser, /public app dock remains pinned after long-page scrolling/);
  assert.match(browser, /mobile workspace dock is a persistent body-level viewport layer/);
  assert.match(browser, /terms gate stays in the visual viewport on a tall mobile page/);
  assert.match(browser, /parentIsBody/);
});

test("v0.20.10 release metadata and service-worker cache are synchronized", async () => {
  const packageJson = JSON.parse(await source("package.json"));
  const packageLock = JSON.parse(await source("package-lock.json"));
  const releaseVersion = await source("lib/release-version.ts");
  const updates = await source("lib/trust-architecture-releases.ts");
  const serviceWorker = await source("public/sw.js");
  const releaseDoc = await source("docs/releases/v0.20.10.md");

  assert.equal(packageJson.version, "0.20.10");
  assert.equal(packageLock.version, "0.20.10");
  assert.equal(packageLock.packages[""].version, "0.20.10");
  assert.match(releaseVersion, /CURRENT_RELEASE_VERSION = "v0\.20\.10"/);
  assert.match(releaseVersion, /CURRENT_RELEASE_CODENAME = "Mobile Fixed Layers"/);
  assert.match(updates, /version: "v0\.20\.10"/);
  assert.match(serviceWorker, /CACHE_VERSION = "v0\.20\.10"/);
  assert.match(serviceWorker, /CACHE_REVISION = "mobile-fixed-layers-r1"/);
  assert.match(releaseDoc, /v0\.20\.10 — Mobile Fixed Layers/);
});
