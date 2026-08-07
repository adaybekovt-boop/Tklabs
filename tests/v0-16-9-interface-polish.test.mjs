import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

function declaredVersion(sourceText, constantName) {
  return sourceText.match(new RegExp(`${constantName}\\s*=\\s*"([^"]+)"`))?.[1] ?? null;
}

test("ConversationArchive keeps an accessible labelled region", async () => {
  const archive = await read("components/playground/ConversationArchive.tsx");

  assert.match(archive, /aria-labelledby=\{headingId\}/);
  assert.match(archive, /<h2 id=\{headingId\} className="sr-only">\{text\.chat\.history\}<\/h2>/);
  assert.doesNotMatch(archive, /\bPlus\b/);
});

test("the document has one vertical page-scroll owner", async () => {
  const layout = await read("app/layout.tsx");
  const polish = await read("app/interface-polish.css");

  assert.match(layout, /interface-polish\.css/);
  assert.match(polish, /body\s*\{/);
  assert.match(polish, /overflow-y:\s*visible/);
  assert.match(polish, /-webkit-overflow-scrolling:\s*auto/);
  assert.doesNotMatch(polish, /html\s*,\s*body/);
});

test("Patch Notes exposes known limitations and migration notes", async () => {
  const patchNotes = await read("app/patch-notes/page.tsx");

  assert.match(patchNotes, /data-preview-release-notices/);
  assert.match(patchNotes, /preview-known-issues-title/);
  assert.match(patchNotes, /preview-migration-title/);
  assert.match(patchNotes, /previewRelease\.knownIssues\.map/);
  assert.match(patchNotes, /previewRelease\.migrationNotes\.map/);
});

test("v0.16.9 Interface Polish remains documented after later releases", async () => {
  const release = await read("lib/release-version.ts");
  const worker = await read("public/sw.js");
  const releaseDoc = await read("docs/releases/v0.16.9.md");

  assert.equal(declaredVersion(release, "CURRENT_RELEASE_VERSION"), declaredVersion(worker, "CACHE_VERSION"));
  assert.match(release, /CURRENT_RELEASE_VERSION = "v\d+\.\d+\.\d+"/);
  assert.match(releaseDoc, /Interface Polish/);
  assert.match(releaseDoc, /tklabs-v0\.16\.9-static/);
  assert.match(releaseDoc, /accessib/i);
});
