import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";

const route = "/fixtures/p5/library";

const manifest = JSON.parse(
  readFileSync(
    path.join(process.cwd(), "content/pilot-staging-manifest.json"),
    "utf8",
  ),
) as { lessons: Array<{ status: string }> };
// Derived from the manifest rather than hardcoded, so this stays correct
// whenever a lesson's status changes (e.g. P6-B1.4 promoted Topic 24 from
// draft to in_review) or a new lesson is added.
const inReviewCount = manifest.lessons.filter(
  (lesson) => lesson.status === "in_review",
).length;

test.describe("P5 fixture library and metadata search", () => {
  test("exposes staging-only populated content, landmarks and noindex", async ({
    page,
  }) => {
    await page.goto(route);

    await expect(page.getByRole("main")).toHaveCount(1);
    await expect(
      page.getByRole("navigation", { name: "Điều hướng fixture P5" }),
    ).toBeVisible();
    await expect(page.getByRole("search")).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex/u,
    );
    await expect(page.getByText("Staging — nội dung đang duyệt")).toBeVisible();
    await expect(page.locator('a[href^="/fixtures/pilot/"]')).toHaveCount(
      inReviewCount,
    );
    await expect(page.locator('a[href^="/chuyen-de/"]')).toHaveCount(0);
    await expect(page.getByRole("link", { name: /đăng nhập/iu })).toHaveCount(
      0,
    );
    await expect(
      page.getByRole("button", { name: /tài khoản|tiến độ cá nhân/iu }),
    ).toHaveCount(0);
  });

  test("shows the staging limitation notice as a visible, labelled note (P6-B1.3U)", async ({
    page,
  }) => {
    await page.goto(route);
    const notice = page.getByRole("note", { name: "Lưu ý bản đang duyệt" });
    await expect(notice).toBeVisible();
    await expect(notice).toContainText(/sử dụng dưới hướng dẫn giáo viên/u);
    await expect(
      page.getByText("Giới hạn được lưu theo nguồn").first(),
    ).toBeVisible();
  });

  test("shows Topic 24's card with acceptedLimitationsCount 3, now that it is in_review (P6-B1.4)", async ({
    page,
  }) => {
    await page.goto(route);
    const card = page
      .getByRole("heading", { level: 3, name: "Phân bón hóa học" })
      .locator("xpath=ancestor::li");
    await expect(card).toBeVisible();
    await expect(card.getByText("Giới hạn được lưu theo nguồn")).toBeVisible();
    const dd = card
      .locator("dt", { hasText: "Giới hạn được lưu theo nguồn" })
      .locator("xpath=following-sibling::dd[1]");
    await expect(dd).toHaveText("3");
  });

  test("submits a diacritic-insensitive search with the keyboard", async ({
    page,
  }) => {
    await page.goto(route);
    const input = page.getByRole("searchbox");
    await input.focus();
    await expect(input).toBeFocused();
    await input.fill("dong hoa hoc");
    await input.press("Enter");

    await expect(page).toHaveURL(/\?q=dong\+hoa\+hoc$/u);
    await expect(
      page.getByRole("heading", { name: "Động hóa học", level: 3 }),
    ).toBeVisible();
    await expect(page.locator('a[href^="/fixtures/pilot/"]')).toHaveCount(1);
  });

  test("renders deterministic loading, empty and no-result states", async ({
    page,
  }) => {
    await page.goto(`${route}?state=loading`);
    await expect(page.getByLabel("Đang tải nội dung")).toHaveAttribute(
      "aria-busy",
      "true",
    );

    await page.goto(`${route}?state=empty`);
    await expect(page.getByText("Chưa có nội dung đang duyệt")).toBeVisible();

    await page.goto(`${route}?q=khong-co-ket-qua`);
    await expect(page.getByText(/Không tìm thấy kết quả/u)).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Về thư viện fixture" }),
    ).toBeVisible();
  });

  test("supports keyboard retry from the error state", async ({ page }) => {
    await page.goto(`${route}?state=error`);
    const retry = page.getByRole("link", { name: "Thử lại" });
    await retry.focus();
    await expect(retry).toBeFocused();
    await retry.press("Enter");
    await expect(page).toHaveURL(`${route}?state=populated`);
    await expect(page.locator('a[href^="/fixtures/pilot/"]')).toHaveCount(
      inReviewCount,
    );
  });
});

test.describe("P5 fixture library on mobile", () => {
  test.use({ isMobile: true, viewport: { width: 375, height: 812 } });

  test("has no page-level overflow and keeps touch targets usable", async ({
    page,
  }) => {
    await page.goto(route);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(375);
    expect(await page.evaluate(() => window.innerWidth)).toBe(375);

    for (const control of await page
      .getByRole("main")
      .locator("a, button, input")
      .all()) {
      const box = await control.boundingBox();
      expect(box, "interactive element must have a layout box").not.toBeNull();
      expect(
        box!.height,
        "interactive target must be at least 44px high",
      ).toBeGreaterThanOrEqual(44);
    }
  });
});
