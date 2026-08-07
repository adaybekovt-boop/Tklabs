import { expect, test } from "@playwright/test";

function sseBody(events) {
  return events.map(({ event, data }) => (
    `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
  )).join("");
}

async function waitForClientShell(page) {
  await expect(page.locator("[data-locale-toggle]").first()).toHaveAttribute("data-locale-ready", "true");
}

async function submitVisibleComposer(page, prompt) {
  const textarea = page.locator("textarea:visible").first();
  await expect(textarea).toBeVisible();
  await textarea.fill(prompt);
  const form = textarea.locator("xpath=ancestor::form[1]");
  if (await form.count()) {
    await form.evaluate((element) => element.requestSubmit());
  } else {
    await textarea.press("Enter");
  }
}

async function expectPersistedLocale(page, locale) {
  await expect.poll(() => page.evaluate(() => localStorage.getItem("tklab-locale"))).toBe(locale);
  await expect.poll(async () => {
    const cookies = await page.context().cookies();
    return cookies.find((cookie) => cookie.name === "tklab-locale")?.value ?? null;
  }).toBe(locale);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", locale);
  await waitForClientShell(page);
}

test("public shell, playground, and browser language state remain usable", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", /^(ru|en)$/);
  await waitForClientShell(page);
  const initialLocale = await page.locator("html").getAttribute("lang");
  const nextLocale = initialLocale === "ru" ? "en" : "ru";
  const initialButton = initialLocale === "ru" ? "RU" : "EN";
  const nextButton = nextLocale === "ru" ? "RU" : "EN";

  await page.getByRole("button", { name: nextButton, exact: true }).first().click();
  await expectPersistedLocale(page, nextLocale);

  await page.getByRole("button", { name: initialButton, exact: true }).first().click();
  await expectPersistedLocale(page, initialLocale === "ru" ? "ru" : "en");

  await page.goto("/playground");
  await expect(page.locator("textarea:visible").first()).toBeVisible();
});

test("mocked SSE reaches the transcript without external providers", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes("desktop"), "Desktop transport contract");
  const requestId = "browser-assurance-request";
  await page.route("**/api/demo", async (route) => {
    await route.fulfill({
      status: 200,
      headers: {
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-store",
        "x-request-id": requestId,
      },
      body: sseBody([
        {
          event: "start",
          data: {
            requestId,
            status: "connecting",
            context: {
              estimatedTokens: 8,
              messages: 1,
              attachments: 0,
              limit: 32768,
              compacted: false,
            },
          },
        },
        { event: "delta", data: { text: "Browser assurance " } },
        { event: "delta", data: { text: "response" } },
        {
          event: "meta",
          data: {
            requestId,
            requestedModel: "Erma Auto",
            actualProvider: "nvidia",
            actualModel: "mocked-browser-model",
            latencyMs: 2,
            httpStatus: 200,
          },
        },
        { event: "done", data: { requestId, stopped: false } },
      ]),
    });
  });

  await page.goto("/playground");
  await submitVisibleComposer(page, "Run the browser assurance contract");
  await expect(page.getByText("Browser assurance response", { exact: false })).toBeVisible();
  await expect(page.getByText("Run the browser assurance contract", { exact: false })).toBeVisible();
});

test("mobile playground stays inside the viewport and exposes the mobile composer", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes("mobile"), "Mobile viewport contract");
  await page.goto("/playground");
  await expect(page.getByTestId("mobile-prompt-input")).toBeVisible();
  const overflow = await page.evaluate(() => ({
    viewport: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth,
  }));
  expect(overflow.documentWidth).toBeLessThanOrEqual(overflow.viewport + 1);
  expect(overflow.bodyWidth).toBeLessThanOrEqual(overflow.viewport + 1);
});

test("offline shell and manifest remain installable browser surfaces", async ({ page, request }) => {
  await page.goto("/offline");
  await expect(page.locator("body")).toContainText(/AI requests|AI-запросы/);

  const manifestResponse = await request.get("/manifest.webmanifest");
  expect(manifestResponse.ok()).toBeTruthy();
  const manifest = await manifestResponse.json();
  expect(manifest.display).toBe("standalone");
  expect(manifest.scope).toBe("/");
  expect(Array.isArray(manifest.icons)).toBeTruthy();
});

test("primary surfaces have one main landmark and no unnamed visible buttons", async ({ page }) => {
  await page.goto("/playground");
  await expect(page.locator("main")).toHaveCount(1);
  const unnamedButtons = await page.locator("button:visible").evaluateAll((buttons) => buttons.filter((button) => {
    const text = button.textContent?.trim() ?? "";
    const label = button.getAttribute("aria-label")?.trim() ?? "";
    const labelledBy = button.getAttribute("aria-labelledby")?.trim() ?? "";
    const title = button.getAttribute("title")?.trim() ?? "";
    return !text && !label && !labelledBy && !title;
  }).map((button) => ({
    html: button.outerHTML.slice(0, 500),
    className: button.className,
    testId: button.getAttribute("data-testid"),
  })));
  expect(unnamedButtons, JSON.stringify(unnamedButtons, null, 2)).toEqual([]);
});
