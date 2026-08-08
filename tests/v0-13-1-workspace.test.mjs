import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
async function text(path) { return readFile(new URL(path, root), "utf8"); }

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
});

test("desktop chat keeps archive, transcript, and a simplified contextual drawer", async () => {
  const chat = await text("components/playground/PlaygroundChat.tsx");
  const drawer = await text("components/playground/ChatContextDrawer.tsx");
  assert.match(chat, /data-calm-chat-workspace/);
  assert.match(chat, /chat-desktop-sidebar/);
  assert.match(chat, /<ChatContextDrawer/);
  assert.match(chat, /drawerOpen/);
  assert.match(drawer, /data-chat-context-drawer/);
  assert.match(drawer, /type DrawerTab = "activity" \| "context"/);
  assert.match(drawer, /What Erma is doing|Что делает Erma/);
  assert.match(drawer, /onProjectChange/);
  assert.doesNotMatch(drawer, /GitCompareArrows|CHAT_RESPONSE_MODES|Settings2/);
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
  assert.match(titleHook, /firstSentence/);
});

test("answers preserve regeneration, previous versions, branching, and optional comparison capability", async () => {
  const hook = await text("hooks/use-chat-request.ts");
  const messages = await text("components/playground/MessageList.tsx");
  assert.match(hook, /function regenerateMessage/);
  assert.match(hook, /function restorePreviousVersion/);
  assert.match(hook, /async function compareMessage/);
  assert.match(hook, /previousVersions/);
  assert.match(messages, /onRegenerate/);
  assert.match(messages, /onRestorePrevious/);
  assert.match(messages, /onBranch/);
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

test("the unified composer keeps only user-goal controls while Erma owns routing", async () => {
  const input = await text("components/ui/ai-chat-input.tsx");
  const responsive = await text("components/playground/ResponsiveChatComposer.tsx");
  const modes = await text("lib/chat-modes.ts");
  assert.match(input, /DOCUMENT_ACCEPT/);
  assert.match(input, /onAttachmentsChange/);
  assert.match(input, /handlePrimaryAction/);
  assert.match(input, /<textarea/);
  assert.match(responsive, /PromptInput as ResponsiveChatComposer/);
  assert.doesNotMatch(input, /setSettingsOpen|CHAT_RESPONSE_MODES|SlidersHorizontal|Deep reasoning/);
  assert.match(modes, /"normal" \| "analysis" \| "code" \| "search" \| "document"/);
});

test("mobile history and message actions are explicit while edge swipe remains optional", async () => {
  const chat = await text("components/playground/PlaygroundChat.tsx");
  const drawer = await text("components/playground/MobileChatDrawer.tsx");
  const messages = await text("components/playground/ResponsiveMessageList.tsx");
  assert.match(chat, /<MobileChatDrawer/);
  assert.match(chat, /deltaX > 72/);
  assert.match(drawer, /ConversationArchive/);
  assert.match(drawer, /data-mobile-chat-drawer/);
  assert.match(messages, /MoreHorizontal/);
  assert.match(messages, /ChatOverlay/);
  assert.match(messages, /startLongPress/);
});

test("stream stop preserves partial text, tables scroll, and code can open fullscreen", async () => {
  const hook = await text("hooks/use-chat-request.ts");
  const markdown = await text("components/playground/MarkdownMessage.tsx");
  assert.match(hook, /stopped: true/);
  assert.match(markdown, /overflow-x-auto overscroll-x-contain/);
  assert.match(markdown, /FullscreenCodeBlock/);
  assert.match(markdown, /Open code fullscreen/);
});

test("language stays globally reachable while chat history remains single-purpose", async () => {
  const dock = await text("components/site/AppDock.tsx");
  const drawer = await text("components/playground/MobileChatDrawer.tsx");
  assert.match(dock, /LanguageToggle locale=\{locale\}/);
  assert.match(dock, /safe-area-inset-bottom/);
  assert.match(drawer, /ConversationArchive/);
  assert.match(drawer, /safe-area-bottom/);
  assert.doesNotMatch(drawer, /LanguageToggle/);
});

test("every v0.13 release remains in public Patch Notes and release documents", async () => {
  const releases = await text("lib/latest-release.ts");
  const page = await text("app/patch-notes/page.tsx");
  const v0130 = await text("docs/releases/v0.13.0.md");
  const v0131 = await text("docs/releases/v0.13.1.md");
  assert.match(releases, /version: "v0\.13\.1"/);
  assert.match(releases, /version: "v0\.13\.0"/);
  assert.match(page, /getReleaseHistory\(locale\)/);
  assert.match(v0130, /True Chat and Streaming/);
  assert.match(v0131, /ветвлен/);
});
