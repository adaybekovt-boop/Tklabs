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