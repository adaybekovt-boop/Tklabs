import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function text(path) {
  return readFile(new URL(path, root), "utf8");
}

test("v0.16.7 gives profile one responsive hierarchy on mobile and desktop", async () => {
  const page = await text("app/profile/page.tsx");
  const summary = await text("components/profile/MobileProfileSummary.tsx");
  const card = await text("components/profile/MembershipCard.tsx");

  assert.match(page, /MobileProfileSummary/);
  assert.match(page, /data-profile-section-nav/);
  assert.match(page, /id="membership"/);
  assert.match(page, /id="overview"/);
  assert.match(page, /id="account-details"/);
  assert.match(summary, /data-mobile-profile-summary/);
  assert.match(summary, /data-profile-visual-hero/);
  assert.match(summary, /data-profile-action-grid/);
  assert.match(summary, /href="\/vault"/);
  assert.match(summary, /releaseVersion/);
  assert.doesNotMatch(summary, /release-v0-11-1/);
  assert.match(card, /data-profile-membership-card/);
  assert.match(card, /aspect-\[1\.38\/1\]/);
  assert.match(card, /aria-describedby=\{hintId\}/);
});

test("local profile data actions distinguish conversation export from complete Workspace Vault backup", async () => {
  const localData = await text("components/profile/ProfileLocalData.tsx");

  assert.match(localData, /type PendingAction = "clear" \| "reset" \| null/);
  assert.match(localData, /pendingAction !== "clear"/);
  assert.match(localData, /pendingAction !== "reset"/);
  assert.match(localData, /data-profile-vault-card/);
  assert.match(localData, /href="\/vault"/);
  assert.match(localData, /CHAT_SETTING_KEYS/);
  assert.match(localData, /10_000/);
  assert.match(localData, /document\.body\.append\(link\)/);
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
