import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function text(path) {
  return readFile(new URL(path, root), "utf8");
}

test("v0.13.1 persists pinned sessions and user-defined titles", async () => {
  const archive = await text("lib/local-archive.ts");

  assert.match(archive, /pinned\?: boolean/);
  assert.match(archive, /customTitle\?: boolean/);
  assert.match(archive, /export function renameSession/);
  assert.match(archive, /export function toggleSessionPinned/);
  assert.match(archive, /existing\?\.customTitle \? existing\.title : generatedTitle/);
  assert.match(archive, /Number\(right\.pinned === true\) - Number\(left\.pinned === true\)/);
});

test("conversation workspace supports search, pinning, rename, delete, and safe clearing", async () => {
  const workspace = await text("components/playground/ConversationArchive.tsx");

  assert.match(workspace, /clearArmed/);
  assert.match(workspace, /confirmClearArchive/);
  assert.match(workspace, /renameSession/);
  assert.match(workspace, /toggleSessionPinned/);
  assert.match(workspace, /aria-pressed=\{session\.pinned === true\}/);
  assert.match(workspace, /Trash2/);
  assert.doesNotMatch(workspace, /window\.confirm/);
});

test("RU and EN controls stay directly reachable on mobile site and chat screens", async () => {
  const header = await text("components/site/StitchHeader.tsx");
  const chatPage = await text("app/playground/page.tsx");

  assert.match(header, /flex shrink-0 items-center gap-2 lg:hidden/);
  assert.match(header, /<LanguageToggle locale=\{locale\} label=\{text\.nav\.language\} \/>/);
  assert.match(chatPage, /fixed right-14 top-2/);
  assert.match(chatPage, /sm:hidden/);
  assert.match(chatPage, /<LanguageToggle locale=\{locale\} label=\{text\.nav\.language\} \/>/);
});

test("every v0.13 release has public Patch Notes and a release document", async () => {
  const releases = await text("lib/latest-release.ts");
  const page = await text("app/patch-notes/page.tsx");
  const v0130 = await text("docs/releases/v0.13.0.md");
  const v0131 = await text("docs/releases/v0.13.1.md");

  assert.match(releases, /version: "v0\.13\.1"/);
  assert.match(releases, /version: "v0\.13\.0"/);
  assert.match(releases, /getReleaseHistory/);
  assert.match(page, /const entries = getReleaseHistory\(locale\)/);
  assert.match(v0130, /True Chat and Streaming/);
  assert.match(v0131, /Chat Workspace/);
}
);
