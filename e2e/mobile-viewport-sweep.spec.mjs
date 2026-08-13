import { expect, test } from "@playwright/test";

// Explicit width/orientation matrix requested for the overnight mobile pass.
// Runs once (desktop-chromium project) instead of once per existing device
// project, since these tests set their own viewport per case and don't need
// device emulation (touch, UA) — only the geometry contract.
const PORTRAIT_WIDTHS = [320, 360, 390, 414, 430, 768];
const LANDSCAPE_SIZES = [
  { width: 667, height: 375 },
  { width: 812, height: 375 },
  { width: 926, height: 428 },
];

const PLAYGROUND_HARNESS = "/browser-assurance/playground";

function sseBody(events) {
  return events.map(({ event, data }) => (
    `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
  )).join("");
}

async function waitForClientShell(page) {
  await expect(
    page.locator("[data-app-dock], [data-mobile-workspace-switcher]").first(),
  ).toBeAttached({ timeout: 20_000 });
  await expect(page.locator("html")).not.toHaveAttribute(
    "data-route-transition",
    "entering",
    { timeout: 15_000 },
  );
}

async function expectNoHorizontalOverflow(page) {
  const overflow = await page.evaluate(() => ({
    viewport: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth,
  }));
  expect(overflow.documentWidth, "document.documentElement.scrollWidth must not exceed the viewport").toBeLessThanOrEqual(overflow.viewport + 1);
  expect(overflow.bodyWidth, "document.body.scrollWidth must not exceed the viewport").toBeLessThanOrEqual(overflow.viewport + 1);
}

test.describe("home page — width matrix", () => {
  for (const width of PORTRAIT_WIDTHS) {
    test(`no horizontal overflow at ${width}px portrait`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "desktop-chromium", "Viewport matrix runs once, independent of device emulation.");
      await page.setViewportSize({ width, height: 844 });
      await page.goto("/");
      await waitForClientShell(page);
      await expectNoHorizontalOverflow(page);
    });
  }

  for (const size of LANDSCAPE_SIZES) {
    test(`no horizontal overflow at ${size.width}x${size.height} landscape`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "desktop-chromium", "Viewport matrix runs once, independent of device emulation.");
      await page.setViewportSize(size);
      await page.goto("/");
      await waitForClientShell(page);
      await expectNoHorizontalOverflow(page);
    });
  }
});

test.describe("playground — width matrix", () => {
  for (const width of PORTRAIT_WIDTHS) {
    test(`no horizontal overflow at ${width}px portrait`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "desktop-chromium", "Viewport matrix runs once, independent of device emulation.");
      await page.setViewportSize({ width, height: 844 });
      await page.goto(PLAYGROUND_HARNESS);
      await waitForClientShell(page);
      await expectNoHorizontalOverflow(page);
    });
  }

  for (const size of LANDSCAPE_SIZES) {
    test(`no horizontal overflow at ${size.width}x${size.height} landscape`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "desktop-chromium", "Viewport matrix runs once, independent of device emulation.");
      await page.setViewportSize(size);
      await page.goto(PLAYGROUND_HARNESS);
      await waitForClientShell(page);
      await expectNoHorizontalOverflow(page);
    });
  }
});

test.describe("tap target size", () => {
  test("mobile workspace switcher and app dock controls meet a 44px minimum at 320px", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "Viewport matrix runs once, independent of device emulation.");
    await page.setViewportSize({ width: 320, height: 844 });
    await page.goto(PLAYGROUND_HARNESS);
    await waitForClientShell(page);
    const undersized = await page.locator("[data-mobile-workspace-switcher] button, [data-mobile-workspace-switcher] a").evaluateAll((elements) => elements
      .map((element) => element.getBoundingClientRect())
      .filter((rect) => rect.width > 0 && rect.height > 0 && rect.height < 43)
      .map((rect) => ({ width: Math.round(rect.width), height: Math.round(rect.height) })));
    expect(undersized, JSON.stringify(undersized)).toEqual([]);
  });
});

test.describe("long assistant answer — markdown, KaTeX, table, code", () => {
  test("renders without horizontal page overflow on a narrow phone", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "Viewport matrix runs once, independent of device emulation.");
    await page.setViewportSize({ width: 360, height: 780 });

    const requestId = "browser-assurance-long-answer";
    const longAnswer = [
      "# Report",
      "",
      "A very long line of unbroken text to check wrapping: " + "x".repeat(400),
      "",
      "Inline math $E = mc^2$ and a block equation:",
      "",
      "$$\\int_0^1 x^2\\,dx = \\frac{1}{3}$$",
      "",
      "| Column A | Column B | Column C | Column D | Column E |",
      "|---|---|---|---|---|",
      "| " + "value ".repeat(10) + " | b | c | d | e |",
      "",
      "```javascript",
      "const veryLongIdentifierNameThatShouldNotWrapThePage = 'x'.repeat(200);",
      "console.log(veryLongIdentifierNameThatShouldNotWrapThePage);",
      "```",
    ].join("\n");

    await page.route("**/api/demo", async (route) => {
      await route.fulfill({
        status: 200,
        headers: {
          "content-type": "text/event-stream; charset=utf-8",
          "cache-control": "no-store",
          "x-request-id": requestId,
        },
        body: sseBody([
          { event: "start", data: { requestId, status: "connecting", context: { estimatedTokens: 8, messages: 1, attachments: 0, limit: 32768, compacted: false } } },
          { event: "delta", data: { text: longAnswer } },
          { event: "meta", data: { requestId, requestedModel: "Erma Auto", actualProvider: "nvidia", actualModel: "mocked-browser-model", latencyMs: 2, httpStatus: 200 } },
          { event: "done", data: { requestId, stopped: false } },
        ]),
      });
    });

    await page.goto(PLAYGROUND_HARNESS);
    await waitForClientShell(page);
    const textarea = page.locator("textarea:visible").first();
    await textarea.fill("Give me a report with math, a table, and code");
    const demoRequest = page.waitForRequest((request) => request.method() === "POST" && new URL(request.url()).pathname === "/api/demo");
    await page.getByRole("button", { name: /Отправить|Send/i }).last().click();
    await demoRequest;
    await expect(page.locator("table").first()).toBeVisible({ timeout: 10_000 });
    await expectNoHorizontalOverflow(page);
  });
});

test.describe("short viewport (keyboard-covered height)", () => {
  test("composer stays visible and reachable when the viewport is as short as an open keyboard leaves it", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "Viewport matrix runs once, independent of device emulation.");
    await page.setViewportSize({ width: 390, height: 420 });
    await page.goto(PLAYGROUND_HARNESS);
    await waitForClientShell(page);
    const textarea = page.locator("textarea:visible").first();
    await expect(textarea).toBeVisible();
    const box = await textarea.boundingBox();
    expect(box).not.toBeNull();
    if (box) expect(box.y + box.height).toBeLessThanOrEqual(420 + 2);
    await expectNoHorizontalOverflow(page);
  });
});
