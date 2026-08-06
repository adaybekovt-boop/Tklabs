import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function text(path) {
  return readFile(new URL(path, root), "utf8");
}

test("v0.11.1 gives the profile a dedicated compact mobile hierarchy", async () => {
  const page = await text("app/profile/page.tsx");
  const summary = await text("components/profile/MobileProfileSummary.tsx");

  assert.match(page, /MobileProfileSummary/);
  assert.match(page, /mb-12 hidden items-start/);
  assert.match(page, /mb-section-gap hidden md:block/);
  assert.match(summary, /data-mobile-profile-summary/);
  assert.match(summary, /href="#local-data"/);
  assert.match(summary, /md:hidden/);
  assert.match(summary, /<details/);
  assert.match(summary, /release-v0-11-1/);
});

test("local profile data actions use cancellable in-page confirmation", async () => {
  const localData = await text("components/profile/ProfileLocalData.tsx");

  assert.match(localData, /type PendingAction = "clear" \| "reset" \| null/);
  assert.match(localData, /pendingAction !== "clear"/);
  assert.match(localData, /pendingAction !== "reset"/);
  assert.match(localData, /aria-live="polite"/);
  assert.match(localData, /data-local-data-actions/);
  assert.match(localData, /id="local-data"/);
  assert.doesNotMatch(localData, /window\.confirm/);
});

test("mobile releases focus one version and use the complete stable release registry", async () => {
  const page = await text("app/patch-notes/page.tsx");
  const mobile = await text("components/site/MobileReleaseBrowser.tsx");
  const releases = await text("lib/latest-release.ts");

  assert.match(page, /MobileReleaseBrowser/);
  assert.match(page, /getReleaseHistory/);
  assert.match(page, /hidden lg:block/);
  assert.match(mobile, /data-mobile-release-browser/);
  assert.match(mobile, /navigator\.share/);
  assert.match(mobile, /navigator\.clipboard\.writeText/);
  assert.match(mobile, /hashchange/);
  assert.match(mobile, /ArrowLeft/);
  assert.match(mobile, /ArrowRight/);
  assert.match(releases, /version: "v0\.13\.1"/);
  assert.match(releases, /version: "v0\.13\.0"/);
  assert.match(releases, /version: "v0\.12\.0"/);
  assert.match(releases, /version: "v0\.11\.1"/);
  assert.match(releases, /version: "v0\.11\.0"/);
  assert.match(releases, /getReleaseHistory/);
});
