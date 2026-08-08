import { expect, test } from "@playwright/test";

const PLAYGROUND_HARNESS = "/browser-assurance/playground";

function sseBody(events) {
  return events.map(({ event, data }) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`).join("");
}

async function waitForClientShell(page) {
  await expect(page.locator("[data-locale-toggle]").first()).toHaveAttribute("data-locale-ready", "true", { timeout: 15_000 });
  await expect(page.locator("html")).not.toHaveAttribute("data-route-transition", "entering", { timeout: 15_000 });
}

async function submitVisibleComposer(page, prompt) {
  const textarea = page.locator("textarea:visible").first();
  await expect(textarea).toBeVisible();
  await textarea.fill(prompt);
  await page.getByRole("button", { name: /Отправить|Send/i }).last().click();
}

test("Erma renders display LaTeX through KaTeX without an external provider", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes("desktop"), "Desktop math rendering contract");
  const requestId = "browser-assurance-latex";
  const math = "$$x^2+2x+1=(x+1)^2$$";

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
        { event: "delta", data: { text: `Verified result:\n\n${math}` } },
        { event: "meta", data: { requestId, requestedModel: "Erma · Auto", actualProvider: "nvidia", actualModel: "mocked-math-model", latencyMs: 2, httpStatus: 200 } },
        { event: "done", data: { requestId, stopped: false } },
      ]),
    });
  });

  await page.goto(PLAYGROUND_HARNESS);
  await waitForClientShell(page);
  await submitVisibleComposer(page, "Render the verified equation");

  const katex = page.locator(".katex").last();
  await expect(katex).toBeVisible();
  await expect(katex).toContainText("x");
  await expect(page.locator(".katex-mathml").last()).toHaveCount(1);
  await expect(page.getByText("Verified result:", { exact: false })).toBeVisible();
});
