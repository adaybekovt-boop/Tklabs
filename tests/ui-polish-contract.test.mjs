import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("membership tiers stay server-driven while the card is interactive", async () => {
  const card = await text("components/profile/MembershipCard.tsx");
  const profile = await text("app/profile/page.tsx");

  assert.match(card, /"use client"/);
  assert.match(card, /useMotionValue/);
  assert.match(card, /useSpring/);
  assert.match(card, /onPointerMove=\{handlePointerMove\}/);
  assert.match(card, /isFlipped/);
  assert.match(card, /rotateY: isFlipped \? 180 : 0/);
  assert.match(card, /membership-card--platinum/);
  assert.match(card, /membership-card--gold/);
  assert.match(card, /thomas-tm\.jpg/);
  assert.match(profile, /isAdmin=\{isAdmin\}/);
  assert.match(profile, /getProfileAccess/);
  assert.doesNotMatch(card, /ADMIN_EMAILS|UNLIMITED_AI_EMAILS|@gmail|@bk\.ru/);
});

test("profile card motion remains accessible and optional", async () => {
  const card = await text("components/profile/MembershipCard.tsx");

  assert.match(card, /useReducedMotion/);
  assert.match(card, /event\.pointerType === "touch"/);
  assert.match(card, /aria-pressed=\{isFlipped\}/);
  assert.match(card, /focus-visible:ring-4/);
  assert.match(card, /type="button"/);
});

test("release history uses the interactive browser and includes v0.10.0", async () => {
  const page = await text("app/patch-notes/page.tsx");
  const browser = await text("components/site/PatchNotesBrowser.tsx");
  const latest = await text("lib/latest-release.ts");

  assert.match(page, /PatchNotesBrowser/);
  assert.match(page, /getLatestRelease/);
  assert.match(browser, /type="search"/);
  assert.match(browser, /aria-expanded=\{open\}/);
  assert.match(browser, /filteredEntries/);
  assert.match(latest, /version: "v0\.10\.0"/);
  assert.match(latest, /TK × Thomas/);
});

test("secondary surfaces no longer repeat the primary wordmark", async () => {
  const footer = await text("components/site/StitchFooter.tsx");
  const developers = await text("app/developers/page.tsx");
  const home = await text("app/page.tsx");

  assert.doesNotMatch(footer, /SiteLogo|TK LAB/);
  assert.match(footer, /grid w-full grid-cols-2/);
  assert.doesNotMatch(developers, /0\{index \+ 1\} \/ TK LAB/);
  assert.match(home, /getLatestRelease/);
  assert.doesNotMatch(home, /FlaskConical/);
});
