import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function text(path) {
  return readFile(new URL(path, root), "utf8");
}

test("production deployment and browser capabilities match the current app", async () => {
  const workflow = await text(".github/workflows/deploy-cloudflare.yml");
  const nextConfig = await text("next.config.ts");
  const packageJson = JSON.parse(await text("package.json"));

  assert.match(workflow, /push:[\s\S]*branches:[\s\S]*- main/);
  assert.match(workflow, /concurrency:/);
  assert.match(nextConfig, /microphone=\(self\)/);
  assert.match(packageJson.scripts.test, /node --test tests\/\*\.test\.mjs/);
});

test("protected API routes fail safely when Auth.js is unavailable", async () => {
  const clodex = await text("app/api/clodex/route.ts");
  const access = await text("app/api/profile/access/route.ts");

  assert.match(clodex, /Authentication service is temporarily unavailable/);
  assert.match(clodex, /getAuthenticatedEmail|Unable to read authentication session/);
  assert.match(access, /getAuthenticatedEmail/);
  assert.match(access, /unavailableResponse/);
});

test("local archive is bounded, sanitized, and observable by the archive UI", async () => {
  const archive = await text("lib/local-archive.ts");
  const archiveUi = await text("components/playground/ConversationArchive.tsx");
  const playground = await text("app/playground/page.tsx");

  assert.match(archive, /MAX_ARCHIVE_JSON_LENGTH/);
  assert.match(archive, /MAX_MESSAGE_CONTENT_LENGTH/);
  assert.match(archive, /tklab:archive-updated/);
  assert.match(archive, /catch/);
  assert.match(archiveUi, /loadArchive/);
  assert.match(archiveUi, /playground\?session=/);
  assert.match(playground, /ConversationArchive/);
});

test("developers section is available in both navigation surfaces", async () => {
  const page = await text("app/developers/page.tsx");
  const header = await text("components/site/StitchHeader.tsx");
  const footer = await text("components/site/StitchFooter.tsx");
  const translations = await text("lib/i18n.ts");

  assert.match(page, /text\.developers\.people/);
  assert.match(translations, /name: "THOMAS TM"/);
  assert.match(translations, /name: "TK"/);
  assert.match(header, /href: "\/developers"/);
  assert.match(footer, /href="\/developers"/);
  assert.match(translations, /developers: "Разработчики"/);
  assert.match(translations, /developers: "Developers"/);
});

test("new Playground does not show the duplicated empty-state heading", async () => {
  const playground = await text("components/playground/PlaygroundChat.tsx");
  const heading = "<h2 className=\"mb-3 max-w-2xl font-serif text-[36px] leading-[1.2] text-primary md:text-[48px]\">{text.chat.emptyTitle}</h2>";
  assert.equal(playground.split(heading).length - 1, 1);
});
