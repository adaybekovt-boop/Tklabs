import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { applyAgentRunEvent, createEmptyAgentRun, isAgentRunEvent } from "../lib/ai/agent-run.ts";
import { encodeAgentRunEvent, parseAgentRunEventFrame } from "../lib/ai/stream-v2.ts";
import { createArtifact, snapshotArtifact, updateArtifact } from "../lib/artifacts/local-store.ts";
import { getPreviewRelease } from "../lib/prerelease.ts";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("v0.16.0 beta.2 is explicitly published as a major preview", async () => {
  const release = getPreviewRelease("en");
  const patchPage = await read("app/patch-notes/page.tsx");
  const releaseDoc = await read("docs/releases/v0.16.0-beta.2.md");

  assert.equal(release.version, "v0.16.0-beta.2");
  assert.equal(release.channel, "preview");
  assert.equal(release.majorUpdate, true);
  assert.equal(release.codename, "Erma Nova");
  assert.equal(release.stability, "beta");
  assert.match(release.title, /Architecture Foundation/);
  assert.match(patchPage, /MAJOR UPDATE · PRE-RELEASE/);
  assert.match(patchPage, /getPreviewRelease/);
  assert.match(releaseDoc, /MAJOR UPDATE · PRE-RELEASE/);
  assert.match(releaseDoc, /Architecture Foundation/);
});

test("Erma Nova wraps the compatible chat in a dedicated workspace", async () => {
  const page = await read("app/playground/page.tsx");
  const workspace = await read("components/playground/ErmaNovaWorkspace.tsx");

  assert.match(page, /ErmaNovaWorkspace/);
  assert.doesNotMatch(page, /<PlaygroundChat/);
  assert.match(workspace, /<PlaygroundChat locale=\{locale\}/);
  assert.match(workspace, /ArtifactStudio/);
  assert.match(workspace, /AgentRunPanel/);
  assert.match(workspace, /data-erma-nova-workspace/);
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
