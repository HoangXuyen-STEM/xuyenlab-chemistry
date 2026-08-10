import { expect, test } from "@playwright/test";

test("renders the foundation page", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Nền tảng ứng dụng đã sẵn sàng" }),
  ).toBeVisible();
});
