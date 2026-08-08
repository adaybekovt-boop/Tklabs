import { expect, test } from "@playwright/test";

test("public Trust Center exposes real routes and legal surfaces", async ({ page }) => {
  await page.goto("/truth");
  await expect(page.getByText(/local-first/i).first()).toBeVisible();
  await expect(page.getByText(/External model provider/i).first()).toBeVisible();
  await page.goto("/legal/privacy");
  await expect(page.getByRole("heading", { name: /Privacy|конфиденциальности/i })).toBeVisible();
  await expect(page.getByText(/end-to-end encryption/i).first()).toBeVisible();
  await page.goto("/status");
  await expect(page.getByText(/not a 100% uptime claim|не заявление о 100% uptime/i)).toBeVisible();
});
