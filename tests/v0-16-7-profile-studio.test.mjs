import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Profile Studio exposes a clear account hub on mobile and desktop", async () => {
  const page = await read("app/profile/page.tsx");
  const summary = await read("components/profile/MobileProfileSummary.tsx");
  const card = await read("components/profile/MembershipCard.tsx");

  assert.match(page, /data-profile-section-nav/);
  assert.match(page, /data-profile-desktop-actions/);
  assert.match(page, /CURRENT_RELEASE_VERSION/);
  assert.match(page, /href: "\/vault"/);
  assert.match(summary, /data-profile-visual-hero/);
  assert.match(summary, /data-profile-status-grid/);
  assert.match(summary, /data-profile-action-grid/);
  assert.match(summary, /href: "\/vault"/);
  assert.match(card, /data-profile-membership-card/);
  assert.match(card, /useReducedMotion/);
  assert.match(card, /event\.pointerType === "touch"/);
  assert.match(card, /aria-describedby=\{hintId\}/);
});

test("mobile bottom navigation prioritizes AI chat and groups every secondary destination", async () => {
  const navigation = await read("components/site/MobileNavigation.tsx");
  const header = await read("components/site/StitchHeader.tsx");

  assert.match(navigation, /prominent: true/);
  assert.match(navigation, /data-mobile-nav-primary/);
  assert.match(navigation, /data-mobile-nav-group/);
  assert.match(navigation, /href: "\/vault"/);
  assert.match(navigation, /aria-controls="mobile-site-menu"/);
  assert.match(navigation, /moreActive/);
  assert.doesNotMatch(navigation, /href: "\/access"/);
  assert.match(header, /workspaceTitle/);
  assert.match(header, /resourcesTitle/);
  assert.match(header, /Workspace Vault/);
});

test("Profile Studio publishes the release and cache bump together", async () => {
  const release = await read("lib/release-version.ts");
  const preview = await read("lib/prerelease.ts");
  const worker = await read("public/sw.js");
  const doc = await read("docs/releases/v0.16.7.md");

  assert.match(release, /CURRENT_RELEASE_VERSION = "v0\.16\.7"/);
  assert.match(release, /CURRENT_RELEASE_CODENAME = "Profile Studio"/);
  assert.match(preview, /codename: "Profile Studio"/);
  assert.match(worker, /CACHE_VERSION = "v0\.16\.7"/);
  assert.match(doc, /tklabs-v0\.16\.7-static/);
});
