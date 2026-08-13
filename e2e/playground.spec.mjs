import { expect, test } from "@playwright/test";

const PLAYGROUND_HARNESS = "/browser-assurance/playground";
const TERMS_HARNESS = "/browser-assurance/terms";

function sseBody(events) {
  return events.map(({ event, data }) => (
    `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
  )).join("");
}

async function waitForClientShell(page) {
  await expect(
    page.locator('[data-app-dock], [data-mobile-workspace-switcher]').first(),
  ).toBeAttached({ timeout: 15_000 });
  // Server rendering intentionally starts from the mobile-safe surface. On wide
  // viewports React then reconciles to the desktop composer. Do not type into the
  // transient textarea while that route/hydration transition is still entering.
  await expect(page.locator("html")).not.toHaveAttribute(
    "data-route-transition",
    "entering",
    { timeout: 15_000 },
  );
}

async function submitVisibleComposer(page, prompt) {
  const textarea = page.locator("textarea:visible").first();
  await expect(page.locator("[data-chat-hydrated=true]")).toBeAttached();
  await expect(textarea).toBeVisible();
  await textarea.fill(prompt);
  await expect(textarea).toHaveValue(prompt);

  const sendButton = page.getByRole("button", { name: /Отправить|Send/i }).last();
  await expect(sendButton).toBeVisible();
  await expect(sendButton).toBeEnabled();
  await sendButton.click();
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

async function expectViewportPinned(locator) {
  await expect(locator).toBeVisible();
  const geometry = await locator.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const visualViewport = window.visualViewport;
    return {
      position: getComputedStyle(element).position,
      top: rect.top,
      bottom: rect.bottom,
      viewportTop: visualViewport?.offsetTop ?? 0,
      viewportBottom: (visualViewport?.offsetTop ?? 0) + (visualViewport?.height ?? window.innerHeight),
      parentIsBody: element.parentElement === document.body,
      bodyTransform: getComputedStyle(document.body).transform,
    };
  });
  expect(geometry.position).toBe("fixed");
  expect(geometry.parentIsBody).toBeTruthy();
  expect(geometry.bodyTransform).toBe("none");
  expect(geometry.top).toBeGreaterThanOrEqual(geometry.viewportTop - 2);
  expect(geometry.bottom).toBeLessThanOrEqual(geometry.viewportBottom + 2);
}

async function expectPopupInsideViewport(locator) {
  await expect(locator).toBeVisible();
  const geometry = await locator.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const viewport = window.visualViewport;
    return {
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      left: rect.left,
      viewportTop: viewport?.offsetTop ?? 0,
      viewportRight: (viewport?.offsetLeft ?? 0) + (viewport?.width ?? window.innerWidth),
      viewportBottom: (viewport?.offsetTop ?? 0) + (viewport?.height ?? window.innerHeight),
      viewportLeft: viewport?.offsetLeft ?? 0,
    };
  });
  expect(geometry.top).toBeGreaterThanOrEqual(geometry.viewportTop - 2);
  expect(geometry.left).toBeGreaterThanOrEqual(geometry.viewportLeft - 2);
  expect(geometry.right).toBeLessThanOrEqual(geometry.viewportRight + 2);
  expect(geometry.bottom).toBeLessThanOrEqual(geometry.viewportBottom + 2);
}

test("public shell, auth gate, and browser harness remain usable", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", /^(ru|en)$/);
  await waitForClientShell(page);

  await page.goto("/playground");
  await expect(page.getByRole("heading", { name: /Вход в лабораторию|Sign in to the laboratory/i })).toBeVisible();
  await expect(page.locator("textarea:visible")).toHaveCount(0);

  await page.goto(PLAYGROUND_HARNESS);
  await waitForClientShell(page);
  await expect(page.locator("textarea:visible").first()).toBeVisible();
});

test("language state persists through hydration", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes("desktop"), "Locale persistence is a desktop hydration contract; mobile projects cover the workspace shell separately.");
  await page.goto("/");
  await waitForClientShell(page);
  const initialLocale = await page.locator("html").getAttribute("lang");
  const nextLocale = initialLocale === "ru" ? "en" : "ru";
  const initialButton = initialLocale === "ru" ? "RU" : "EN";
  const nextButton = nextLocale === "ru" ? "RU" : "EN";

  await page.getByRole("button", { name: nextButton, exact: true }).first().click();
  await expectPersistedLocale(page, nextLocale);

  await page.getByRole("button", { name: initialButton, exact: true }).first().click();
  await expectPersistedLocale(page, initialLocale === "ru" ? "ru" : "en");
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

  await page.goto(PLAYGROUND_HARNESS);
  await waitForClientShell(page);
  const demoRequest = page.waitForRequest((request) => (
    request.method() === "POST" && new URL(request.url()).pathname === "/api/demo"
  ));
  await submitVisibleComposer(page, "Run the browser assurance contract");
  await demoRequest;
  // Scope to the transcript log: once the request lands, the history sidebar
  // also lists this conversation by its first message, which duplicates the
  // same text outside the transcript and makes an unscoped locator ambiguous.
  const transcript = page.getByRole("log");
  await expect(transcript.getByText("Browser assurance response", { exact: false })).toBeVisible();
  await expect(transcript.getByText("Run the browser assurance contract", { exact: false })).toBeVisible();
});

test("desktop history restores saved chats through client navigation", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes("desktop"), "Desktop history contract");
  await page.addInitScript(() => {
    localStorage.setItem("tklab.archive.v1", JSON.stringify([
      {
        id: "desktop-session-alpha",
        title: "Desktop archive alpha",
        model: "erma-auto",
        createdAt: 1,
        updatedAt: 1,
        messages: [
          { id: "alpha-user", role: "user", content: "Alpha prompt" },
          { id: "alpha-answer", role: "assistant", content: "Alpha restored transcript" },
        ],
      },
      {
        id: "desktop-session-beta",
        title: "Desktop archive beta",
        model: "erma-auto",
        createdAt: 2,
        updatedAt: 2,
        messages: [
          { id: "beta-user", role: "user", content: "Beta prompt" },
          { id: "beta-answer", role: "assistant", content: "Beta restored transcript" },
        ],
      },
    ]));
  });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(PLAYGROUND_HARNESS);
  await waitForClientShell(page);

  await page.getByRole("link", { name: /Desktop archive alpha/i }).click();
  await expect(page).toHaveURL(/session=desktop-session-alpha/);
  await expect(page.getByRole("log").getByText("Alpha restored transcript")).toBeVisible();

  await page.getByRole("link", { name: /Desktop archive beta/i }).click();
  await expect(page).toHaveURL(/session=desktop-session-beta/);
  await expect(page.getByRole("log").getByText("Beta restored transcript")).toBeVisible();
  await expect(page.getByRole("log").getByText("Alpha restored transcript")).toHaveCount(0);
});

test("desktop popovers stay in the viewport and model navigation stays scoped", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes("desktop"), "Desktop overlay contract");
  await page.setViewportSize({ width: 1400, height: 650 });
  await page.goto(PLAYGROUND_HARNESS);
  await waitForClientShell(page);

  const attachmentTrigger = page.getByRole("button", { name: /Добавить текстовый файл|Add text file/i }).last();
  await attachmentTrigger.click();
  await expectPopupInsideViewport(page.getByRole("menu"));

  await attachmentTrigger.click();
  const modelTrigger = page.getByRole("combobox", { name: /Model:/i });
  await modelTrigger.focus();
  await modelTrigger.press("Enter");
  const modelMenu = page.locator("[data-slot=model-selector-content]");
  await expectPopupInsideViewport(modelMenu);
  const initialActiveOption = await modelTrigger.getAttribute("aria-activedescendant");
  await modelTrigger.press("ArrowDown");
  await expect(modelTrigger).not.toHaveAttribute("aria-activedescendant", initialActiveOption ?? "");
  await modelTrigger.press("Escape");
  await expect(modelMenu).toHaveCount(0);
});

test("desktop workspace exposes Runs as an honest tab and keeps the shell usable at each desktop width", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes("desktop"), "Desktop workspace contract");
  await page.goto(PLAYGROUND_HARNESS);
  await waitForClientShell(page);

  for (const width of [768, 834, 900, 1024, 1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 720 });
    await expect(page.locator(".chat-desktop-sidebar")).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  }

  await page.getByRole("tab", { name: /Запуски|Runs/i }).click();
  await expect(page.getByRole("tabpanel", { name: /Запуски|Runs/i })).toBeVisible();
});

test("mobile playground stays inside the viewport and exposes the mobile composer", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes("mobile"), "Mobile viewport contract");
  await page.goto(PLAYGROUND_HARNESS);
  await waitForClientShell(page);
  await expect(page.getByTestId("prompt-input")).toBeVisible();
  const overflow = await page.evaluate(() => ({
    viewport: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth,
  }));
  expect(overflow.documentWidth).toBeLessThanOrEqual(overflow.viewport + 1);
  expect(overflow.bodyWidth).toBeLessThanOrEqual(overflow.viewport + 1);
});

test("public app dock remains pinned after long-page scrolling", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes("mobile"), "Mobile fixed-layer contract");
  await page.goto("/");
  await waitForClientShell(page);
  const dock = page.locator("[data-app-dock]");
  await expectViewportPinned(dock);
  const firstTop = await dock.evaluate((element) => element.getBoundingClientRect().top);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(100);
  await expectViewportPinned(dock);
  const secondTop = await dock.evaluate((element) => element.getBoundingClientRect().top);
  expect(Math.abs(firstTop - secondTop)).toBeLessThanOrEqual(2);
});

test("mobile workspace dock is a persistent body-level viewport layer", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes("mobile"), "Mobile workspace dock contract");
  await page.goto(PLAYGROUND_HARNESS);
  await waitForClientShell(page);
  const dock = page.locator("[data-mobile-workspace-switcher]");
  await expectViewportPinned(dock);
  const reservedSpace = await page.locator("[data-erma-nova-workspace]").evaluate((element) => parseFloat(getComputedStyle(element).paddingBottom));
  const dockHeight = await dock.evaluate((element) => element.getBoundingClientRect().height);
  expect(reservedSpace).toBeGreaterThanOrEqual(Math.min(dockHeight - 2, 1));
});

test("terms gate stays in the visual viewport on a tall mobile page", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes("mobile"), "Mobile legal viewport contract");
  await page.route("**/api/account/terms", async (route) => {
    if (route.request().method() !== "GET") return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ required: true, currentVersion: "2026-08-08", language: null }),
    });
  });

  await page.goto(TERMS_HARNESS);
  const gate = page.locator("[data-terms-gate]");
  await expect(gate).toBeVisible();
  await expectViewportPinned(gate);
  await expect.poll(() => page.evaluate(() => document.body.style.position)).toBe("fixed");

  await page.getByRole("button", { name: /Русский|English/i }).first().click();
  const actions = page.locator("[data-terms-gate-actions]");
  await expect(actions).toBeVisible();
  const actionGeometry = await actions.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { top: rect.top, bottom: rect.bottom, viewport: window.visualViewport?.height ?? window.innerHeight };
  });
  expect(actionGeometry.top).toBeGreaterThanOrEqual(-2);
  expect(actionGeometry.bottom).toBeLessThanOrEqual(actionGeometry.viewport + 2);
  await expect(page.locator("[data-terms-gate-scroll]")).toHaveCSS("overflow-y", "auto");
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

test("primary workspace surface has one main landmark and no unnamed visible buttons", async ({ page }) => {
  await page.goto(PLAYGROUND_HARNESS);
  await waitForClientShell(page);
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
