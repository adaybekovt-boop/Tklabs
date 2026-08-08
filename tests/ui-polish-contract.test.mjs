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

test("release history uses mobile and desktop browsers while preview releases stay visible", async () => {
  const page = await text("app/patch-notes/page.tsx");
  const browser = await text("components/site/PatchNotesBrowser.tsx");
  const mobileBrowser = await text("components/site/MobileReleaseBrowser.tsx");
  const history = await text("lib/latest-release.ts");

  assert.match(page, /PatchNotesBrowser/);
  assert.match(page, /MobileReleaseBrowser/);
  assert.match(page, /getPreviewRelease/);
  assert.match(page, /getReleaseHistory/);
  assert.match(browser, /type="search"/);
  assert.match(browser, /overflow-x-auto/);
  assert.match(browser, /copyReleaseLink/);
  assert.match(browser, /role="status"/);
  assert.match(mobileBrowser, /entries/);
  assert.doesNotMatch(browser, /<section className="space-y-4" aria-live="polite">/);
  assert.match(history, /version: "v0\.11\.0"/);
  assert.match(history, /Мобильный интерфейс/);
});

test("secondary surfaces keep branding restrained and the mobile footer is grouped", async () => {
  const footer = await text("components/site/StitchFooter.tsx");
  const developers = await text("app/developers/page.tsx");
  const home = await text("app/page.tsx");

  assert.doesNotMatch(footer, /SiteLogo/);
  assert.match(footer, /<details/);
  assert.match(footer, /Правовая информация|Legal/);
  assert.match(footer, /href="\/vault"/);
  assert.match(developers, /data-developer-ownership/);
  assert.match(developers, /data-engineering-system-map/);
  assert.doesNotMatch(developers, /text-\[100px\]|text-\[120px\]/);
  assert.match(home, /getCurrentRelease/);
  assert.match(home, /aspect-\[16\/10\]/);
  assert.doesNotMatch(home, /FlaskConical/);
});

test("mobile shell uses AppDock, a direct workspace switcher, and safe-area behavior", async () => {
  const [header, dock, switcher, mobileCss] = await Promise.all([
    text("components/site/StitchHeader.tsx"),
    text("components/site/AppDock.tsx"),
    text("components/playground/MobileWorkspaceSwitcher.tsx"),
    text("app/mobile-workspace.css"),
  ]);

  assert.match(header, /hidden[^\n]+lg:block/);
  assert.match(header, /<AppDock /);
  assert.doesNotMatch(header, /MobileNavigation/);
  assert.match(dock, /safe-area-inset-bottom/);
  assert.match(dock, /popstate/);
  assert.match(dock, /role="dialog"/);
  assert.match(dock, /focusable/);
  assert.match(switcher, /data-mobile-workspace-switcher/);
  for (const id of ["chat", "flow", "artifacts", "runs"]) assert.match(switcher, new RegExp(`id: "${id}"`));
  assert.match(mobileCss, /--chat-visual-height/);
  assert.match(mobileCss, /safe-area-inset-bottom/);
});

test("mobile chat keeps drafts, offline state, and compact settings", async () => {
  const chat = await text("components/playground/PlaygroundChat.tsx");
  const input = await text("components/ui/ai-chat-input.tsx");
  const composer = await text("components/playground/ResponsiveChatComposer.tsx");
  const drafts = await text("lib/chat-draft.ts");
  const archiveHook = await text("hooks/use-conversation-archive.ts");

  assert.match(chat, /readChatDraft/);
  assert.match(chat, /writeChatDraft/);
  assert.match(chat, /archive\.sessionId/);
  assert.match(input, /navigator\.onLine/);
  assert.match(input, /WifiOff/);
  assert.match(composer, /data-testid="mobile-prompt-input"/);
  assert.match(composer, /SlidersHorizontal/);
  assert.match(drafts, /tklabs\.chat-draft\.v1/);
  assert.match(archiveHook, /useState\(uid\)/);
});

test("profile exposes local-data controls and the complete Workspace Vault", async () => {
  const profile = await text("app/profile/page.tsx");
  const controls = await text("components/profile/ProfileLocalData.tsx");
  const vaultPage = await text("app/vault/page.tsx");
  const vault = await text("components/vault/WorkspaceVault.tsx");

  assert.match(profile, /ProfileLocalData/);
  assert.match(controls, /loadArchive/);
  assert.match(controls, /clearArchive/);
  assert.match(vaultPage, /WorkspaceVault/);
  assert.match(vault, /createWorkspaceVault/);
  assert.match(vault, /parseWorkspaceVault/);
  assert.match(vault, /applyWorkspaceVault/);
});

test("the application publishes a standalone mobile manifest", async () => {
  const manifest = await text("app/manifest.ts");
  const layout = await text("app/layout.tsx");

  assert.match(manifest, /display: "standalone"/);
  assert.match(manifest, /purpose: "maskable"/);
  assert.match(layout, /viewportFit: "cover"/);
  assert.match(layout, /appleWebApp/);
});
