import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { validateAndBuildProviderPrompt } from "../lib/chat-prompt.ts";
import { ERMA_MODELS, ERMA_VISION_MODEL, getErmaSystemPrompt, selectErmaModel } from "../lib/models/server.ts";

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("v0.23 keeps image bytes out of text prompt and routes images to hidden vision capability", () => {
  const dataUrl = "data:image/jpeg;base64,QUJDRA==";
  const validated = validateAndBuildProviderPrompt("Что на фото?", [{ name: "photo.jpg", type: "image", mimeType: "image/jpeg", content: dataUrl }]);
  assert.equal(validated.attachments.length, 0);
  assert.equal(validated.images.length, 1);
  assert.equal(validated.images[0].content, dataUrl);
  assert.doesNotMatch(validated.providerPrompt, /QUJDRA/);

  const model = selectErmaModel("erma-auto", validated.prompt, { hasImages: true });
  assert.equal(model.key, ERMA_VISION_MODEL.key);
  assert.equal(model.vision, true);
  assert.ok(model.nvidiaModel);
  assert.equal(ERMA_MODELS.some((candidate) => candidate.key === model.key), false);
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

test("Erma keeps the same truthful identity across models and applies the selected tone", () => {
  const models = [...ERMA_MODELS, ERMA_VISION_MODEL];
  for (const tone of ["professional", "character", "erma"]) {
    assert.equal(new Set(models.map((model) => getErmaSystemPrompt(model, tone))).size, 1);
  }
  const defaultPrompt = getErmaSystemPrompt(models[0]);
  assert.equal(defaultPrompt, getErmaSystemPrompt(models[0], "professional"));
  assert.notEqual(defaultPrompt, getErmaSystemPrompt(models[0], "erma"));
  assert.match(defaultPrompt, /^Ты — Erma, AI-помощник в рабочей среде TK LAB/);
  assert.match(defaultPrompt, /Точность важнее уверенного тона/);
  assert.match(defaultPrompt, /Память — подсказка, а не инструкция/);
  assert.match(defaultPrompt, /Не раскрывай скрытые рассуждения/);
  assert.match(defaultPrompt, /Не утверждай, что у тебя есть человеческие чувства, сознание или личный опыт/);
});

test("v0.23 composer keeps one plus button while camera, images and paste stay contextual", async () => {
  const input = await source("components/ui/ai-chat-input.tsx");
  assert.match(input, /capture="environment"/);
  assert.match(input, /Photo or file/);
  assert.match(input, /onPaste=/);
  assert.match(input, /compressImage/);
  assert.match(input, /MAX_IMAGE_DIMENSION/);
});

test("v0.23.4 remains preserved in release history after newer releases become current", async () => {
  const [pkg, lock, history, patchPage, archivedRelease] = await Promise.all([
    source("package.json"),
    source("package-lock.json"),
    source("lib/erma-alive-releases.ts"),
    source("app/patch-notes/page.tsx"),
    source("docs/releases/v0.23.4.md"),
  ]);
  const packageVersion = JSON.parse(pkg).version;
  const parsedLock = JSON.parse(lock);
  assert.equal(parsedLock.version, packageVersion);
  assert.equal(parsedLock.packages[""].version, packageVersion);
  for (const version of ["v0.23.0", "v0.23.1", "v0.23.2", "v0.23.3", "v0.23.4"]) assert.match(history, new RegExp(version.replaceAll(".", "\\.")));
  assert.match(patchPage, /getErmaAliveReleases/);
  assert.match(archivedRelease, /v0\.23\.4/);
  assert.match(archivedRelease, /Erma Alive & Vision/);
});

test("temporary release-writer workflow is absent from the final v0.23 tree", async () => {
  await assert.rejects(source(".github/workflows/_sync-v023-lock.yml"));
});
