import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { applyAgentRunEvent, createEmptyAgentRun, isAgentRunEvent } from "../lib/ai/agent-run.ts";
import { encodeAgentRunEvent, parseAgentRunEventFrame } from "../lib/ai/stream-v2.ts";
import { createArtifact, snapshotArtifact, updateArtifact } from "../lib/artifacts/local-store.ts";
import { getCurrentRelease } from "../lib/current-release.ts";
import { getPreviewRelease } from "../lib/prerelease.ts";
import { CURRENT_RELEASE_BADGE, CURRENT_RELEASE_VERSION } from "../lib/release-version.ts";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("v0.16.0 beta.4 is the shared major preview release", async () => {
  const release = getPreviewRelease("en");
  const current = getCurrentRelease("en");
  const homePage = await read("app/page.tsx");
  const patchPage = await read("app/patch-notes/page.tsx");
  const releaseDoc = await read("docs/releases/v0.16.0-beta.4.md");

  assert.equal(CURRENT_RELEASE_VERSION, "v0.16.0-beta.4");
  assert.equal(CURRENT_RELEASE_BADGE, "v0.16 beta.4");
  assert.equal(release.version, CURRENT_RELEASE_VERSION);
  assert.equal(current.version, CURRENT_RELEASE_VERSION);
  assert.equal(release.channel, "preview");
  assert.equal(release.majorUpdate, true);
  assert.equal(release.codename, "Erma Nova");
  assert.equal(release.stability, "beta");
  assert.match(release.title, /Mobile Chat Rebuild/);
  assert.match(homePage, /getCurrentRelease/);
  assert.doesNotMatch(homePage, /getLatestRelease/);
  assert.match(patchPage, /MAJOR UPDATE · PRE-RELEASE/);
  assert.match(patchPage, /getPreviewRelease/);
  assert.doesNotMatch(patchPage, /beta\.1/);
  assert.match(releaseDoc, /MAJOR UPDATE · PRE-RELEASE/);
  assert.match(releaseDoc, /Mobile Chat Rebuild/);
});

test("Erma Nova mobile chat uses one header and dedicated mobile surfaces", async () => {
  const page = await read("app/playground/page.tsx");
  const workspace = await read("components/playground/ErmaNovaWorkspace.tsx");
  const chat = await read("components/playground/PlaygroundChat.tsx");
  const drawer = await read("components/playground/MobileChatDrawer.tsx");
  const composer = await read("components/playground/ResponsiveChatComposer.tsx");
  const messages = await read("components/playground/ResponsiveMessageList.tsx");
  const agentRuns = await read("components/playground/AgentRunPanel.tsx");
  const artifacts = await read("components/playground/ArtifactStudio.tsx");
  const language = await read("components/site/LanguageToggle.tsx");

  assert.match(page, /ErmaNovaWorkspace/);
  assert.doesNotMatch(page, /fixed right-14 top-2/);
  assert.doesNotMatch(page, /<PlaygroundChat/);
  assert.match(workspace, /<PlaygroundChat locale=\{locale\}/);
  assert.match(workspace, /onOpenArtifacts/);
  assert.match(workspace, /tab !== "chat"/);
  assert.match(workspace, /md:hidden/);
  assert.match(workspace, /role="tablist"/);
  assert.match(workspace, /role="tabpanel"/);
  assert.match(chat, /MobileChatDrawer/);
  assert.match(chat, /ResponsiveChatComposer/);
  assert.match(chat, /ResponsiveMessageList/);
  assert.doesNotMatch(chat, /HistoryDropdown/);
  assert.match(drawer, /data-mobile-chat-drawer/);
  assert.match(drawer, /ConversationArchive/);
  assert.match(drawer, /onOpenArtifacts/);
  assert.match(drawer, /onOpenRuns/);
  assert.match(composer, /data-testid="mobile-prompt-input"/);
  assert.match(composer, /attachments\.length > 0/);
  assert.match(composer, /handlePrimaryAction/);
  assert.match(composer, /Voice \/ Send \/ Stop|primaryLabel/);
  assert.match(messages, /ChatOverlay/);
  assert.match(messages, /startLongPress/);
  assert.match(messages, /max-w-\[86%\]/);
  assert.doesNotMatch(messages, /assistant-message-card/);
  assert.doesNotMatch(agentRuns, /beta\.1/);
  assert.match(artifacts, /data-mobile-artifact-picker/);
  assert.match(artifacts, /data-mobile-version-history/);
  assert.match(artifacts, /role="status"/);
  assert.match(language, /try \{/);
  assert.match(language, /localStorage is unavailable/);
});

test("Agent Run Protocol 2.0 keeps plans bounded and state explicit", () => {
  const started = applyAgentRunEvent(createEmptyAgentRun(), {
    event: "run.started",
    runId: "run-1",
    sequence: 1,
    timestamp: 10,
    payload: { title: "Research" },
  });
  const planned = applyAgentRunEvent(started, {
    event: "plan.created",
    runId: "run-1",
    sequence: 2,
    timestamp: 20,
    payload: { steps: Array.from({ length: 10 }, (_, index) => ({ id: `s${index}`, title: `Step ${index}` })) },
  });
  const completed = applyAgentRunEvent(planned, {
    event: "run.completed",
    runId: "run-1",
    sequence: 3,
    timestamp: 30,
    payload: {},
  });

  assert.equal(started.status, "planning");
  assert.equal(planned.steps.length, 6);
  assert.equal(completed.status, "completed");
  assert.equal(completed.completedAt, 30);
});

test("Artifact Studio models local drafts and explicit version snapshots", () => {
  const artifact = createArtifact("document", "Major plan");
  const edited = updateArtifact(artifact, { content: "First draft" });
  const versioned = snapshotArtifact(edited, "First stable draft");

  assert.equal(artifact.schemaVersion, 1);
  assert.equal(edited.content, "First draft");
  assert.equal(versioned.versions.length, 1);
  assert.equal(versioned.versions[0]?.label, "First stable draft");
});

test("Agent Run Protocol 2.0 has a typed SSE frame", () => {
  const event = {
    event: "run.started",
    runId: "run-2",
    sequence: 1,
    timestamp: 100,
    payload: { title: "Workspace task" },
  };
  const frame = new TextDecoder().decode(encodeAgentRunEvent(event));
  assert.match(frame, /^event: run\.started/);
  assert.deepEqual(parseAgentRunEventFrame(frame), event);
  assert.equal(isAgentRunEvent({ ...event, event: "unknown.event" }), false);
  assert.equal(parseAgentRunEventFrame('event: unknown.event\ndata: {"event":"unknown.event","runId":"run-2","sequence":2,"timestamp":101,"payload":{}}\n\n'), null);
});