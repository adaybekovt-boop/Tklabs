import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { applyAgentRunEvent, createEmptyAgentRun, isAgentRunEvent } from "../lib/ai/agent-run.ts";
import { encodeAgentRunEvent, parseAgentRunEventFrame } from "../lib/ai/stream-v2.ts";
import { createArtifact, snapshotArtifact, updateArtifact } from "../lib/artifacts/local-store.ts";
import { getCurrentRelease } from "../lib/current-release.ts";
import { getPreviewRelease } from "../lib/prerelease.ts";
import { CURRENT_RELEASE_BADGE, CURRENT_RELEASE_CODENAME, CURRENT_RELEASE_VERSION } from "../lib/release-version.ts";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("the current major preview is synchronized and v0.16.9 remains in release history", async () => {
  const release = getPreviewRelease("en");
  const current = getCurrentRelease("en");
  const homePage = await read("app/page.tsx");
  const patchPage = await read("app/patch-notes/page.tsx");
  const releaseDoc = await read("docs/releases/v0.16.9.md");

  assert.equal(CURRENT_RELEASE_BADGE, CURRENT_RELEASE_VERSION);
  assert.equal(release.version, CURRENT_RELEASE_VERSION);
  assert.equal(current.version, CURRENT_RELEASE_VERSION);
  assert.equal(release.channel, "preview");
  assert.equal(release.majorUpdate, true);
  assert.equal(release.codename, CURRENT_RELEASE_CODENAME);
  assert.equal(release.stability, "beta");
  assert.match(homePage, /getCurrentRelease/);
  assert.doesNotMatch(homePage, /getLatestRelease/);
  assert.match(patchPage, /MAJOR UPDATE · PRE-RELEASE/);
  assert.match(patchPage, /getPreviewRelease/);
  assert.match(releaseDoc, /Interface Polish/);
  assert.match(releaseDoc, /accessib/i);
});

test("Erma Flow connects workspace, mobile navigation, runs, artifacts, and motion", async () => {
  const layout = await read("app/layout.tsx");
  const motion = await read("app/motion.css");
  const orchestrator = await read("components/site/MotionOrchestrator.tsx");
  const workspace = await read("components/playground/ErmaNovaWorkspace.tsx");
  const flow = await read("components/playground/ErmaFlowStudio.tsx");
  const runs = await read("components/playground/AgentRunPanel.tsx");
  const drawer = await read("components/playground/MobileChatDrawer.tsx");
  const store = await read("lib/flow/local-store.ts");

  assert.match(layout, /motion\.css/);
  assert.match(layout, /MotionOrchestrator/);
  assert.match(motion, /prefers-reduced-motion/);
  assert.match(motion, /data-mobile-chat-drawer/);
  assert.match(motion, /chat-message-enter/);
  assert.match(motion, /data-erma-flow-studio/);
  assert.match(orchestrator, /IntersectionObserver/);
  assert.match(orchestrator, /MutationObserver/);
  assert.match(workspace, /workspace-tab-flow/);
  assert.match(workspace, /ErmaFlowStudio/);
  assert.match(workspace, /WORKSPACE_SECTION_EVENT/);
  assert.match(flow, /text\/event-stream/);
  assert.match(flow, /saveAsArtifact/);
  assert.match(flow, /controllerRef\.current\?\.abort/);
  assert.match(runs, /loadFlowRuns/);
  assert.doesNotMatch(runs, /No active run/);
  assert.match(drawer, /Erma Flow/);
  assert.match(drawer, /requestWorkspaceSection\("flow"\)/);
  assert.match(store, /tklabs\.erma-flow\.runs\.v1/);
  assert.match(store, /MAX_RUNS = 16/);
});

test("Erma Nova mobile chat keeps the dedicated mobile surfaces", async () => {
  const page = await read("app/playground/page.tsx");
  const chat = await read("components/playground/PlaygroundChat.tsx");
  const drawer = await read("components/playground/MobileChatDrawer.tsx");
  const composer = await read("components/playground/ResponsiveChatComposer.tsx");
  const messages = await read("components/playground/ResponsiveMessageList.tsx");
  const artifacts = await read("components/playground/ArtifactStudio.tsx");
  const language = await read("components/site/LanguageToggle.tsx");

  assert.match(page, /ErmaNovaWorkspace/);
  assert.doesNotMatch(page, /fixed right-14 top-2/);
  assert.doesNotMatch(page, /<PlaygroundChat/);
  assert.match(chat, /MobileChatDrawer/);
  assert.match(chat, /ResponsiveChatComposer/);
  assert.match(chat, /ResponsiveMessageList/);
  assert.doesNotMatch(chat, /HistoryDropdown/);
  assert.match(drawer, /data-mobile-chat-drawer/);
  assert.match(drawer, /ConversationArchive/);
  assert.match(drawer, /href="\/vault"/);
  assert.match(composer, /data-testid="mobile-prompt-input"/);
  assert.match(composer, /attachments\.length > 0/);
  assert.match(composer, /handlePrimaryAction/);
  assert.match(messages, /ChatOverlay/);
  assert.match(messages, /startLongPress/);
  assert.match(messages, /max-w-\[82%\]/);
  assert.doesNotMatch(messages, /assistant-message-card/);
  assert.match(artifacts, /data-mobile-artifact-picker/);
  assert.match(artifacts, /data-mobile-version-history/);
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
