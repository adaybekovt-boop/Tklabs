import { deflateSync } from "node:zlib";
import { expect, test } from "@playwright/test";

const PLAYGROUND_HARNESS = "/browser-assurance/playground";

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, checksum]);
}

function onePixelPng() {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const header = Buffer.alloc(13);
  header.writeUInt32BE(1, 0);
  header.writeUInt32BE(1, 4);
  header[8] = 8;
  header[9] = 6;
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;
  const scanline = Buffer.from([0, 255, 255, 255, 255]);
  return Buffer.concat([
    signature,
    pngChunk("IHDR", header),
    pngChunk("IDAT", deflateSync(scanline)),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function sseBody(events) {
  return events.map(({ event, data }) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`).join("");
}

async function waitForClientShell(page) {
  await expect(page.locator('[data-app-dock], [data-mobile-workspace-switcher]').first()).toBeAttached({ timeout: 15_000 });
  await expect(page.locator("html")).not.toHaveAttribute("data-route-transition", "entering", { timeout: 15_000 });
  await expect(page.locator("[data-chat-hydrated=true]")).toBeAttached({ timeout: 15_000 });
}

async function acknowledgeTrustDisclosure(page) {
  const disclosure = page.locator('[data-trust-jit-disclosure="true"]');
  if (!(await disclosure.isVisible().catch(() => false))) return;
  await disclosure.locator("button").click();
  await expect(disclosure).toBeHidden();
}

function mockedResponse(requestId, answer, attachments = 0) {
  return sseBody([
    { event: "start", data: { requestId, status: "connecting", context: { estimatedTokens: 16, messages: 1, attachments, limit: 32768, compacted: false } } },
    { event: "delta", data: { text: answer } },
    { event: "meta", data: { requestId, requestedModel: "Erma", actualProvider: "nvidia", actualModel: "mock-v023", latencyMs: 2, httpStatus: 200 } },
    { event: "done", data: { requestId, stopped: false } },
  ]);
}

test("Erma renders bracket-style aligned LaTeX through KaTeX", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes("desktop"), "One deterministic desktop rendering contract is sufficient.");
  await page.route("**/api/demo", async (route) => {
    await route.fulfill({
      status: 200,
      headers: { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-store" },
      body: mockedResponse("v023-latex", String.raw`\[\begin{aligned}2x+4&=10\\x&=3\end{aligned}\]`),
    });
  });

  await page.goto(PLAYGROUND_HARNESS);
  await waitForClientShell(page);
  const textarea = page.getByTestId("prompt-input").locator("textarea");
  await textarea.fill("Реши в LaTeX");
  await page.getByRole("button", { name: /Отправить|Send/i }).last().click();

  await expect(page.locator(".katex").first()).toBeVisible({ timeout: 10_000 });
  await expect(page.locator(".katex-html").first()).not.toContainText(String.raw`\begin{aligned}`);
});

test("image-only composer submission sends a bounded multimodal attachment", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes("desktop"), "One deterministic desktop upload contract is sufficient.");
  let submittedBody = null;
  await page.route("**/api/demo", async (route) => {
    submittedBody = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      headers: { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-store" },
      body: mockedResponse("v023-image", "Изображение получено.", 1),
    });
  });

  await page.goto(PLAYGROUND_HARNESS);
  await waitForClientShell(page);
  const composer = page.getByTestId("prompt-input");
  const fileInput = page.locator('input[type="file"][multiple]').first();
  await expect(fileInput).toHaveCount(1);
  await fileInput.setInputFiles({ name: "pixel.png", mimeType: "image/png", buffer: onePixelPng() });
  await expect(composer.getByText("pixel.png")).toBeVisible({ timeout: 10_000 });

  const send = page.getByRole("button", { name: /Отправить|Send/i }).last();
  await expect(send).toBeEnabled();
  await send.click();
  await expect(page.getByText("Изображение получено.", { exact: false })).toBeVisible();

  expect(submittedBody).toBeTruthy();
  expect(submittedBody.prompt).toMatch(/изображение|image/i);
  expect(submittedBody.attachments).toHaveLength(1);
  expect(submittedBody.attachments[0].type).toBe("image");
  expect(submittedBody.attachments[0].mimeType).toBe("image/jpeg");
  expect(submittedBody.attachments[0].content).toMatch(/^data:image\/jpeg;base64,/);
  expect(Buffer.byteLength(submittedBody.attachments[0].content, "utf8")).toBeLessThan(900 * 1024);
});

test("mobile attachment plus opens a visible tappable menu inside the visual viewport", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes("mobile"), "This regression is specific to the mobile composer stack.");

  await page.goto(PLAYGROUND_HARNESS);
  await waitForClientShell(page);
  await acknowledgeTrustDisclosure(page);

  const composer = page.getByTestId("prompt-input");
  await expect(composer).toBeVisible({ timeout: 15_000 });
  // Scope past the model picker trigger: it renders earlier in the composer
  // and also carries aria-expanded, so a bare [aria-expanded] + .first()
  // grabs the wrong control (confirmed independently by both overnight
  // agents — see AGENT_AUDIT_MOBILE.md).
  const attachmentButton = composer.locator('button[aria-expanded]:not([role="combobox"])').first();
  await expect(attachmentButton).toHaveAttribute("aria-expanded", "false");
  await expect(attachmentButton).toBeVisible();
  await expect(attachmentButton).toBeEnabled();
  await attachmentButton.tap();
  await expect(attachmentButton).toHaveAttribute("aria-expanded", "true");

  const menu = page.locator('[data-attachment-menu]');
  await expect(menu).toBeVisible();
  const menuBox = await menu.boundingBox();
  expect(menuBox).toBeTruthy();
  const visualViewport = await page.evaluate(() => ({
    left: window.visualViewport?.offsetLeft ?? 0,
    top: window.visualViewport?.offsetTop ?? 0,
    width: window.visualViewport?.width ?? window.innerWidth,
    height: window.visualViewport?.height ?? window.innerHeight,
  }));
  expect(menuBox.x).toBeGreaterThanOrEqual(visualViewport.left);
  expect(menuBox.y).toBeGreaterThanOrEqual(visualViewport.top);
  expect(menuBox.x + menuBox.width).toBeLessThanOrEqual(visualViewport.left + visualViewport.width);
  expect(menuBox.y + menuBox.height).toBeLessThanOrEqual(visualViewport.top + visualViewport.height);

  const hitTest = await page.evaluate(({ x, y }) => {
    const node = document.elementFromPoint(x, y);
    return Boolean(node?.closest('[data-attachment-menu]'));
  }, { x: menuBox.x + menuBox.width / 2, y: menuBox.y + menuBox.height / 2 });
  expect(hitTest).toBe(true);
});
