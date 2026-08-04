import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
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

test("status page uses live health checks", async () => {
  const route = await text("app/api/status/route.ts");
  const page = await text("app/status/page.tsx");
  const board = await text("components/status/StatusBoard.tsx");

  assert.match(route, /PROVIDER_TIMEOUT_MS = 2_500/);
  assert.match(route, /integrate\.api\.nvidia\.com\/v1\/models/);
  assert.match(route, /clodex\.xyz\/v1\/models/);
  assert.match(route, /cache-control/);
  assert.match(page, /StatusBoard/);
  assert.match(board, /fetch\("\/api\/status"/);
  assert.match(board, /text\.status\.refresh/);
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
  assert.match(translations, /thomas-tm\.jpg/);
  assert.match(translations, /tk\.jpg/);
  await access(new URL("public/images/developers/thomas-tm.jpg", root));
  await access(new URL("public/images/developers/tk.jpg", root));
  assert.match(header, /href: "\/developers"/);
  assert.match(footer, /href="\/developers"/);
  assert.match(translations, /developers: "Разработчики"/);
  assert.match(translations, /developers: "Developers"/);
});

test("patch notes are linked and written as an English release log", async () => {
  const page = await text("app/patch-notes/page.tsx");
  const header = await text("components/site/StitchHeader.tsx");
  const footer = await text("components/site/StitchFooter.tsx");
  const translations = await text("lib/i18n.ts");

  assert.match(page, /text\.patchNotes\.entries/);
  assert.match(page, /Release history/);
  assert.match(header, /href: "\/patch-notes"/);
  assert.match(footer, /href="\/patch-notes"/);
  assert.match(translations, /patchNotes: "Patch Notes"/);
  assert.match(translations, /version: "v0\.5\.1"/);
  assert.match(translations, /Developers & release transparency/);
});

test("the header reflects the authenticated session", async () => {
  const header = await text("components/site/StitchHeader.tsx");

  assert.match(header, /await auth\(\)/);
  assert.match(header, /href=\{signedIn \? "\/profile" : "\/login"\}/);
  assert.match(header, /signedIn \? text\.nav\.profile : text\.nav\.login/);
});

test("profile uses the provider avatar and exposes admin state", async () => {
  const profile = await text("app/profile/page.tsx");
  const translations = await text("lib/i18n.ts");
  const footer = await text("components/site/StitchFooter.tsx");
  const css = await text("app/globals.css");

  assert.match(profile, /session\?\.user\?\.image/);
  assert.doesNotMatch(profile, /aida-public/);
  assert.match(profile, /adminAccess/);
  assert.match(profile, /adminState/);
  assert.match(translations, /Модельный маршрут Clodex/);
  assert.match(translations, /Clodex model route/);
  assert.match(footer, /grid w-full grid-cols-2/);
  assert.match(css, /--spacing-section-gap: 72px/);
});

test("privileged workspace access is reflected in the client and profile", async () => {
  const publicModels = await text("lib/erma-public.ts");
  const playground = await text("components/playground/PlaygroundChat.tsx");
  const profile = await text("app/profile/page.tsx");
  const input = await text("components/ui/ai-chat-input.tsx");

  assert.match(publicModels, /PRIVILEGED_MAX_PROMPT_LENGTH = 16_000/);
  assert.match(playground, /clodexAccess\?\.unlimited \? PRIVILEGED_MAX_PROMPT_LENGTH/);
  assert.match(playground, /maxLength=\{promptLimit\}/);
  assert.match(profile, /isPrivilegedAiEmail/);
  assert.match(profile, /unlimitedDailyValue/);
  assert.match(input, /try \{\n      recognition\.start\(\);/);
});

test("new Playground does not show the duplicated empty-state heading", async () => {
  const playground = await text("components/playground/PlaygroundChat.tsx");
  const heading = "<h2 className=\"mb-3 max-w-2xl font-serif text-[36px] leading-[1.2] text-primary md:text-[48px]\">{text.chat.emptyTitle}</h2>";
  assert.equal(playground.split(heading).length - 1, 1);
});
