import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function text(path) {
  return readFile(new URL(path, root), "utf8");
}

test("v0.13.1 persists workspace metadata, versions, comparisons, and branches", async () => {
  const archive = await text("lib/local-archive.ts");

  assert.match(archive, /pinned\?: boolean/);
  assert.match(archive, /customTitle\?: boolean/);
  assert.match(archive, /project\?: string/);
  assert.match(archive, /versions\?: ArchivedMessageVersion\[\]/);
  assert.match(archive, /comparison\?: ArchivedMessageComparison/);
  assert.match(archive, /parentSessionId\?: string/);
  assert.match(archive, /branchedFromMessageId\?: string/);
  assert.match(archive, /export function renameSession/);
  assert.match(archive, /export function toggleSessionPinned/);
  assert.match(archive, /export function duplicateSession/);
  assert.match(archive, /export function branchSession/);
  assert.match(archive, /export function setSessionProject/);
  assert.match(archive, /existing\?\.customTitle \? existing\.title : generatedTitle/);
  assert.match(archive, /Number\(right\.pinned === true\) - Number\(left\.pinned === true\)/);
});

test("desktop chat keeps archive, transcript, and an optional contextual drawer", async () => {
  const chat = await text("components/playground/PlaygroundChat.tsx");
  const drawer = await text("components/playground/ChatContextDrawer.tsx");

  assert.match(chat, /data-calm-chat-workspace/);
  assert.match(chat, /chat-desktop-sidebar/);
  assert.match(chat, /<ChatContextDrawer/);
  assert.match(chat, /drawerOpen/);
  assert.match(drawer, /data-chat-context-drawer/);
  assert.match(drawer, /type DrawerTab = "activity" \| "context"/);
  assert.match(drawer, /GitCompareArrows/);
  assert.match(drawer, /onProjectChange/);
  assert.match(drawer, /xl:flex/);
});

test("conversation workspace preserves search, pinning, rename, duplicate, projects, delete, and safe clearing", async () => {
  const workspace = await text("components/playground/ConversationArchive.tsx");
  const titleHook = await text("hooks/use-conversation-archive.ts");

  assert.match(workspace, /clearArmed/);
  assert.match(workspace, /confirmClearArchive/);
  assert.match(workspace, /renameSession/);
  assert.match(workspace, /toggleSessionPinned/);
  assert.match(workspace, /duplicateSession/);
  assert.match(workspace, /session\.project/);
  assert.match(workspace, /MoreHorizontal/);
  assert.match(workspace, /Trash2/);
  assert.doesNotMatch(workspace, /window\.confirm/);
  assert.match(titleHook, /replace\(\/```\[\\s\\S\]\*\?```\/g/);
  assert.match(titleHook, /firstSentence/);
});

test("answers preserve regeneration, previous versions, branching, and side-by-side comparison", async () => {
  const hook = await text("hooks/use-chat-request.ts");
  const messages = await text("components/playground/MessageList.tsx");

  assert.match(hook, /function regenerateMessage/);
  assert.match(hook, /function restorePreviousVersion/);
  assert.match(hook, /async function compareMessage/);
  assert.match(hook, /function messagesThrough/);
  assert.match(hook, /previousVersions/);
  assert.match(messages, /data-model-comparison/);
  assert.match(messages, /onRegenerate/);
  assert.match(messages, /onRestorePrevious/);
  assert.match(messages, /onBranch/);
  assert.match(messages, /GitCompareArrows/);
});

test("technical provider diagnostics are removed from normal messages", async () => {
  const messages = await text("components/playground/MessageList.tsx");

  assert.doesNotMatch(messages, /Provider:/);
  assert.doesNotMatch(messages, /Request ID:/);
  assert.doesNotMatch(messages, /Latency:/);
  assert.doesNotMatch(messages, /TTFT:/);
  assert.doesNotMatch(messages, /actualProvider/);
  assert.match(messages, /MoreHorizontal/);
  assert.match(messages, /AgentActivity/);
});

test("mobile composer keeps plus, message, voice, and send while settings stay in a sheet", async () => {
  const input = await text("components/ui/ai-chat-input.tsx");
  const modes = await text("lib/chat-modes.ts");

  assert.match(input, /sm:hidden/);
  assert.match(input, /setSettingsOpen\(true\)/);
  assert.match(input, /CHAT_RESPONSE_MODES/);
  assert.match(input, /onAttachmentsChange/);
  assert.match(input, /Deep reasoning/);
  assert.match(input, /Attached files/);
  assert.match(input, /SlidersHorizontal/);
  assert.match(modes, /"normal" \| "analysis" \| "code" \| "search" \| "document"/);
  assert.match(modes, /Do not invent browsing or citations/);
});

test("mobile history and message actions are explicit while edge swipe remains optional", async () => {
  const chat = await text("components/playground/PlaygroundChat.tsx");
  const drawer = await text("components/playground/MobileChatDrawer.tsx");
  const messages = await text("components/playground/ResponsiveMessageList.tsx");

  assert.match(chat, /<MobileChatDrawer/);
  assert.match(chat, /deltaX > 72/);
  assert.match(chat, /setMobileHistoryOpen\(true\)/);
  assert.match(drawer, /ConversationArchive/);
  assert.match(drawer, /data-mobile-chat-drawer/);
  assert.match(messages, /MoreHorizontal/);
  assert.match(messages, /ChatOverlay/);
  assert.match(messages, /startLongPress/);
});

test("stream stop preserves partial text, tables scroll, and code can open fullscreen", async () => {
  const hook = await text("hooks/use-chat-request.ts");
  const markdown = await text("components/playground/MarkdownMessage.tsx");

  assert.match(hook, /content: message\.content \|\| text\.chat\.generationStopped/);
  assert.match(hook, /stopped: true/);
  assert.match(markdown, /overflow-x-auto overscroll-x-contain/);
  assert.match(markdown, /FullscreenCodeBlock/);
  assert.match(markdown, /Open code fullscreen/);
});

test("RU and EN controls stay reachable through current mobile navigation surfaces", async () => {
  const dock = await text("components/site/AppDock.tsx");
  const drawer = await text("components/playground/MobileChatDrawer.tsx");

  assert.match(dock, /LanguageToggle locale=\{locale\} label=\{labels\.language\}/);
  assert.match(dock, /safe-area-inset-bottom/);
  assert.match(drawer, /<LanguageToggle locale=\{locale\} label=\{text\.nav\.language\} \/>/);
  assert.match(drawer, /safe-area-bottom/);
});

test("every v0.13 release remains in public Patch Notes and release documents", async () => {
  const releases = await text("lib/latest-release.ts");
  const page = await text("app/patch-notes/page.tsx");
  const v0130 = await text("docs/releases/v0.13.0.md");
  const v0131 = await text("docs/releases/v0.13.1.md");

  assert.match(releases, /version: "v0\.13\.1"/);
  assert.match(releases, /version: "v0\.13\.0"/);
  assert.match(releases, /getReleaseHistory/);
  assert.match(page, /getReleaseHistory\(locale\)/);
  assert.match(page, /getPreviewRelease\(locale\)/);
  assert.match(page, /MobileReleaseBrowser/);
  assert.match(page, /PatchNotesBrowser/);
  assert.match(v0130, /True Chat and Streaming/);
  assert.match(v0131, /трёхзон/);
  assert.match(v0131, /ветвлен/);
  assert.match(v0131, /сравнен/);
});
