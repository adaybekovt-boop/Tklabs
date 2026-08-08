import { expect, test } from "@playwright/test";

const PLAYGROUND_HARNESS = "/browser-assurance/playground";
const ONE_PIXEL_PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

function sseBody(events) {
  return events.map(({ event, data }) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`).join("");
}

async function waitForClientShell(page) {
  await expect(page.locator('[data-app-dock], [data-mobile-workspace-switcher]').first()).toBeAttached({ timeout: 15_000 });
  await expect(page.locator("html")).not.toHaveAttribute("data-route-transition", "entering", { timeout: 15_000 });
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
  await expect(page.locator("main")).not.toContainText(String.raw`\begin{aligned}`);
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
  await fileInput.setInputFiles({ name: "pixel.png", mimeType: "image/png", buffer: Buffer.from(ONE_PIXEL_PNG, "base64") });
  await expect(composer.getByText("pixel.png")).toBeVisible();

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