import { expect, test } from "@playwright/test";

const openPublicRoute = (page, path) => page.goto(path, { waitUntil: "domcontentloaded" });

test("public Trust Center exposes real routes and legal surfaces", async ({ page }) => {
  await openPublicRoute(page, "/truth");
  await expect(page.getByText(/local-first/i).first()).toBeVisible();
  await expect(page.getByText(/External model provider/i).first()).toBeVisible();
  await openPublicRoute(page, "/legal/privacy");
  await expect(page.getByRole("heading", { name: /Privacy|конфиденциальности/i })).toBeVisible();
  await expect(page.getByText(/end-to-end encryption/i).first()).toBeVisible();
  await openPublicRoute(page, "/status");
  await expect(page.getByText(/not a 100% uptime claim|не заявление о 100% uptime/i)).toBeVisible();
});
