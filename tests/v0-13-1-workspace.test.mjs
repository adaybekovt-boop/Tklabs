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

test("desktop chat uses three zones and a contextual right drawer", async () => {
  const chat = await text("components/playground/PlaygroundChat.tsx");
  const drawer = await text("components/playground/ChatContextDrawer.tsx");

  assert.match(chat, /data-three-zone-chat-workspace/);
  assert.match(chat, /chat-desktop-sidebar/);
  assert.match(chat, /<ChatContextDrawer/);
  assert.match(chat, /drawerOpen/);
  assert.match(drawer, /data-chat-context-drawer/);
  assert.match(drawer, /"context" \| "files" \| "sources" \| "settings"/);
  assert.match(drawer, /GitCompareArrows/);
  assert.match(drawer, /onProjectChange/);
  assert.match(drawer, /xl:flex/);
});

test("conversation workspace supports search, pinning, rename, duplicate, projects, delete, and safe clearing", async () => {
  const workspace = await text("components/playground/ConversationArchive.tsx");
  const titleHook = await text("hooks/use-conversation-archive.ts");

  assert.match(workspace, /clearArmed/);
  assert.match(workspace, /confirmClearArchive/);
  assert.match(workspace, /renameSession/);
  assert.match(workspace, /toggleSessionPinned/);
  assert.match(workspace, /duplicateSession/);
  assert.match(workspace, /session\.project/);
  assert.match(workspace, /aria-pressed=\{session\.pinned === true\}/);
  assert.match(workspace, /Trash2/);
  assert.doesNotMatch(workspace, /window\.confirm/);
  assert.match(titleHook, /replace\(\/```\[\\s\\S\]\*\?```\/g/);
  assert.match(titleHook, /firstSentence/);
});

test("answers support regeneration, previous versions, branching, and side-by-side comparison", async () => {
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

test("technical metadata is collapsed behind Details", async () => {
  const messages = await text("components/playground/MessageList.tsx");

  assert.match(messages, /data-message-details/);
  assert.match(messages, /<details/);
  assert.match(messages, /Provider:/);
  assert.match(messages, /Request ID:/);
  assert.match(messages, /data-compact-message-actions/);
  assert.doesNotMatch(messages, /message\.meta\?\.actualProvider && <span className="ml-auto/);
});

test("mobile composer keeps only plus, message, voice, and send while settings move into a bottom sheet", async () => {
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

test("mobile gestures and long-press actions are explicit", async () => {
  const chat = await text("components/playground/PlaygroundChat.tsx");
  const overlay = await text("components/playground/ChatOverlay.tsx");
  const messages = await text("components/playground/MessageList.tsx");

  assert.match(chat, /deltaX > 72/);
  assert.match(chat, /setMobileHistoryOpen\(true\)/);
  assert.match(overlay, /deltaY > 72/);
  assert.match(messages, /holdTimerRef/);
  assert.match(messages, /520/);
  assert.match(messages, /mobile-message-actions-title/);
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
  assert.match(v0131, /трёхзон/);
  assert.match(v0131, /ветвлен/);
  assert.match(v0131, /сравнен/);
});
