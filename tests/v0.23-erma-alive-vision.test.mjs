import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { validateAndBuildProviderPrompt } from "../lib/chat-prompt.ts";
import { selectErmaModel } from "../lib/models/server.ts";

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("v0.23 keeps image bytes out of text prompt and routes images to vision", () => {
  const dataUrl = "data:image/jpeg;base64,QUJDRA==";
  const validated = validateAndBuildProviderPrompt("Что на фото?", [{ name: "photo.jpg", type: "image", mimeType: "image/jpeg", content: dataUrl }]);
  assert.equal(validated.attachments.length, 0);
  assert.equal(validated.images.length, 1);
  assert.equal(validated.images[0].content, dataUrl);
  assert.doesNotMatch(validated.providerPrompt, /QUJDRA/);

  const model = selectErmaModel("erma-auto", validated.prompt, { hasImages: true });
  assert.equal(model.vision, true);
  assert.equal(model.nvidiaModel, "qwen/qwen3.5-122b-a10b");
});

test("v0.23 sends NVIDIA real multimodal content parts and treats visuals as untrusted", async () => {
  const provider = await source("lib/ai/providers/nvidia.ts");
  assert.match(provider, /type:\s*"image_url"/);
  assert.match(provider, /image_url:\s*\{\s*url:\s*image\.content/);
  assert.match(provider, /untrusted user-provided visual data/);
  assert.match(provider, /nvidia_model_has_no_vision/);
});

test("v0.23 normalizes bracket LaTeX before remark-math instead of showing raw delimiters", async () => {
  const markdown = await source("components/playground/MarkdownMessage.tsx");
  assert.match(markdown, /normalizeMathMarkdown/);
  assert.match(markdown, /replace\(\/\\\\\\\[/);
  assert.match(markdown, /replace\(\/\\\\\\\(/);
  assert.match(markdown, /remarkMath/);
  assert.match(markdown, /rehypeKatex/);
});

test("v0.23 speech recognition reconstructs final segments instead of cumulatively appending them", async () => {
  const input = await source("components/ui/ai-chat-input.tsx");
  assert.match(input, /speechFinalByIndexRef/);
  assert.match(input, /dedupeAdjacentSpeechSegments/);
  assert.doesNotMatch(input, /transcriptBaseRef\.current\s*=\s*`\$\{prefix\}/);
});

test("v0.23 Erma personality is adaptive and does not reintroduce manual role modes", async () => {
  const models = await source("lib/models/server.ts");
  assert.match(models, /вопрос действительно философский/);
  assert.match(models, /Не превращай всё в философию/);
  assert.match(models, /не набором режимов/);
  assert.match(models, /Markdown-совместимый LaTeX/);
  assert.doesNotMatch(models, /===\s*1\.\s*ФИЛОСОФ|===\s*2\.\s*ШУТНИК|===\s*3\.\s*СОВЕТНИК/);
});

test("v0.23 composer keeps one plus button while camera, images and paste stay contextual", async () => {
  const input = await source("components/ui/ai-chat-input.tsx");
  assert.match(input, /capture="environment"/);
  assert.match(input, /Photo or file/);
  assert.match(input, /onPaste=/);
  assert.match(input, /compressImage/);
  assert.match(input, /MAX_IMAGE_DIMENSION/);
});

test("v0.23.4 release identity, patch history and service-worker namespace stay synchronized", async () => {
  const [pkg, lock, release, preview, history, patchPage, sw] = await Promise.all([
    source("package.json"),
    source("package-lock.json"),
    source("lib/release-version.ts"),
    source("lib/prerelease.ts"),
    source("lib/erma-alive-releases.ts"),
    source("app/patch-notes/page.tsx"),
    source("public/sw.js"),
  ]);
  assert.equal(JSON.parse(pkg).version, "0.23.4");
  const parsedLock = JSON.parse(lock);
  assert.equal(parsedLock.version, "0.23.4");
  assert.equal(parsedLock.packages[""].version, "0.23.4");
  assert.match(release, /CURRENT_RELEASE_VERSION = "v0\.23\.4"/);
  assert.match(release, /Erma Alive & Vision/);
  assert.match(preview, /ERMA ALIVE & VISION/);
  for (const version of ["v0.23.0", "v0.23.1", "v0.23.2", "v0.23.3", "v0.23.4"]) assert.match(history, new RegExp(version.replaceAll(".", "\\.")));
  assert.match(patchPage, /getErmaAliveReleases/);
  assert.match(sw, /CACHE_VERSION = "v0\.23\.4"/);
  assert.match(sw, /erma-alive-vision-r1/);
});

test("temporary release-writer workflow is absent from the final v0.23 tree", async () => {
  await assert.rejects(source(".github/workflows/_sync-v023-lock.yml"));
});