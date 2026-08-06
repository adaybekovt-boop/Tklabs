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

test("release history uses the mobile-friendly browser and includes v0.11.0", async () => {
  const page = await text("app/patch-notes/page.tsx");
  const browser = await text("components/site/PatchNotesBrowser.tsx");
  const latest = await text("lib/latest-release.ts");

  assert.match(page, /PatchNotesBrowser/);
  assert.match(page, /getLatestRelease/);
  assert.match(browser, /type="search"/);
  assert.match(browser, /overflow-x-auto/);
  assert.match(browser, /copyReleaseLink/);
  assert.match(browser, /role="status"/);
  assert.doesNotMatch(browser, /<section className="space-y-4" aria-live="polite">/);
  assert.match(latest, /version: "v0\.11\.0"/);
  assert.match(latest, /Мобильный интерфейс/);
});

test("secondary surfaces keep branding restrained and the mobile footer is grouped", async () => {
  const footer = await text("components/site/StitchFooter.tsx");
  const developers = await text("app/developers/page.tsx");
  const home = await text("app/page.tsx");

  assert.doesNotMatch(footer, /SiteLogo|TK LAB/);
  assert.match(footer, /<details/);
  assert.match(footer, /Правовая информация|Legal/);
  assert.doesNotMatch(developers, /0\{index \+ 1\} \/ TK LAB/);
  assert.match(home, /getLatestRelease/);
  assert.match(home, /aspect-\[16\/10\]/);
  assert.doesNotMatch(home, /FlaskConical/);
});

test("mobile shell provides dedicated navigation and safe-area behavior", async () => {
  const header = await text("components/site/StitchHeader.tsx");
  const navigation = await text("components/site/MobileNavigation.tsx");

  assert.match(header, /MobileNavigation/);
  assert.match(navigation, /mobile-bottom-navigation/);
  assert.match(navigation, /safe-area-inset-bottom/);
  assert.match(navigation, /popstate/);
  assert.match(navigation, /role="dialog"/);
  assert.match(navigation, /focusable/);
  assert.match(navigation, /document\.body\.style\.paddingBottom/);
});

test("mobile chat keeps drafts, offline state, and compact settings", async () => {
  const chat = await text("components/playground/PlaygroundChat.tsx");
  const input = await text("components/ui/ai-chat-input.tsx");
  const drafts = await text("lib/chat-draft.ts");
  const archiveHook = await text("hooks/use-conversation-archive.ts");

  assert.match(chat, /readChatDraft/);
  assert.match(chat, /writeChatDraft/);
  assert.match(chat, /archive\.sessionId/);
  assert.match(input, /navigator\.onLine/);
  assert.match(input, /WifiOff/);
  assert.match(input, /sm:hidden/);
  assert.match(input, /SlidersHorizontal/);
  assert.match(drafts, /tklabs\.chat-draft\.v1/);
  assert.match(archiveHook, /useState\(uid\)/);
});

test("profile exposes local-only export and reset controls", async () => {
  const profile = await text("app/profile/page.tsx");
  const controls = await text("components/profile/ProfileLocalData.tsx");

  assert.match(profile, /ProfileLocalData/);
  assert.match(controls, /loadArchive/);
  assert.match(controls, /clearArchive/);
  assert.match(controls, /application\/json/);
  assert.match(controls, /tklabs\.chat-draft\.v1/);
});

test("the application publishes a standalone mobile manifest", async () => {
  const manifest = await text("app/manifest.ts");
  const layout = await text("app/layout.tsx");

  assert.match(manifest, /display: "standalone"/);
  assert.match(manifest, /purpose: "maskable"/);
  assert.match(layout, /viewportFit: "cover"/);
  assert.match(layout, /appleWebApp/);
});
