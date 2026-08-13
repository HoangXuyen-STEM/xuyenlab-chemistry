import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";

const lessons = [
  {
    path: "/fixtures/pilot/chuyen-de-06/dong-hoa-hoc",
    remediationQueuePath:
      "content/qa/pending/dong-hoa-hoc.remediation-queue.json",
    title: "Động hóa học",
  },
  {
    path: "/fixtures/pilot/chuyen-de-08/dung-dich-va-can-bang-hoa-hoc",
    remediationQueuePath:
      "content/qa/pending/dung-dich-va-can-bang-hoa-hoc.remediation-queue.json",
    title: "Dung dịch và cân bằng hóa học",
  },
].map((lesson) => ({
  ...lesson,
  visibleBlockingIssueIds: readRemediationQueue(lesson.remediationQueuePath)
    .filter(
      (entry) => entry.severity === "blocking" && entry.status !== "applied",
    )
    .map((entry) => entry.issueId)
    .sort(),
}));

test.describe("pilot staging routes", () => {
  test("loads both lessons and the pilot index without client errors", async ({
    page,
  }) => {
    for (const lesson of lessons) {
      await expectRouteToLoad(page, lesson.path);
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.locator("h1")).toContainText(lesson.title);
    }

    await expectRouteToLoad(page, "/fixtures/pilot");
    for (const lesson of lessons) {
      await expect(page.locator(`a[href="${lesson.path}"]`)).toBeVisible();
    }
  });

  test("builds a TOC that targets every lesson h2", async ({ page }) => {
    for (const lesson of lessons) {
      await page.goto(lesson.path);
      const toc = page.getByRole("navigation", { name: "Mục lục bài học" });
      await expect(toc).toBeVisible();

      const headingCount = await page.locator("article h2").count();
      const links = toc.locator("a");
      await expect(links).toHaveCount(headingCount);

      const href = await links.first().getAttribute("href");
      expect(href).toMatch(/^#.+/u);
      await links.first().click();
      await expect
        .poll(async () =>
          page.evaluate((id) => {
            const heading = document.getElementById(id);
            if (!heading) return false;
            const { bottom, top } = heading.getBoundingClientRect();
            return top >= 0 && bottom <= window.innerHeight;
          }, href!.slice(1)),
        )
        .toBe(true);
    }
  });

  test("keeps every table inside an overflow-x auto wrapper", async ({
    page,
  }) => {
    for (const lesson of lessons) {
      await page.goto(lesson.path);
      expect(
        await page.locator("table").evaluateAll((tables) =>
          tables.every((table) => {
            const wrapper = table.parentElement;
            return (
              wrapper !== null && getComputedStyle(wrapper).overflowX === "auto"
            );
          }),
        ),
        `${lesson.path} has a table outside a horizontal scroll wrapper`,
      ).toBe(true);
    }
  });

  test("renders all blocking fallback warnings visibly with stable issue IDs", async ({
    page,
  }) => {
    for (const lesson of lessons) {
      await page.goto(lesson.path);
      // P4.1's importer titles each blocking fallback Callout by the kind of
      // Word object it could not convert (embeddedObject/drawing/formula),
      // so a blocking Callout may carry any of these three aria-labels.
      const blockingCalloutTitles = [
        "Đối tượng Word cần biên tập",
        "Hình vẽ Word cần biên tập",
        "Công thức cần biên tập",
      ];
      const blockingCallouts = page.locator(
        blockingCalloutTitles
          .map((title) => `aside[aria-label="${title}"]`)
          .join(", "),
      );
      await expect(blockingCallouts).toHaveCount(
        lesson.visibleBlockingIssueIds.length,
      );
      const visibleIssueIds = await blockingCallouts.evaluateAll((callouts) =>
        callouts.flatMap((callout) => {
          if ((callout as HTMLElement).offsetParent === null) return [];
          return callout.textContent?.match(/T0[68]-S01:[a-z0-9]+/gu) ?? [];
        }),
      );
      expect(visibleIssueIds.sort()).toEqual(lesson.visibleBlockingIssueIds);
    }
  });

  test("hides staging controls but retains lesson content in print media", async ({
    page,
  }) => {
    for (const lesson of lessons) {
      await page.goto(lesson.path);
      await page.emulateMedia({ media: "print" });

      await expect(page.locator("h1")).toBeVisible();
      expect(
        await page
          .locator("div")
          .filter({
            hasText:
              /^\[BẢN NHÁP PILOT\] — Xem trước staging, không cần đăng nhập — chưa xuất bản$/u,
          })
          .evaluate((banner) => getComputedStyle(banner).display),
      ).toBe("none");
      expect(
        await page
          .locator("button")
          .filter({ hasText: /^In \/ Lưu PDF$/u })
          .evaluate((button) => getComputedStyle(button).display),
      ).toBe("none");
      expect(
        await page
          .locator("h1")
          .evaluate(
            (heading) => (heading as HTMLElement).offsetParent !== null,
          ),
      ).toBe(true);
      await page.emulateMedia({ media: "screen" });
    }
  });

  test("exposes basic landmarks, logical headings, image alternatives, and keyboard entry", async ({
    page,
  }) => {
    for (const lesson of lessons) {
      await page.goto(lesson.path);

      await expect(page.getByRole("main")).toHaveCount(1);
      await expect(page.getByRole("navigation").first()).toBeVisible();
      await expect(page.locator("header")).toHaveCount(1);

      expect(
        await page.locator("h1, h2, h3, h4, h5, h6").evaluateAll((headings) =>
          headings.every((heading, index) => {
            if (index === 0) return heading.tagName === "H1";
            const previousLevel = Number(headings[index - 1].tagName.slice(1));
            const level = Number(heading.tagName.slice(1));
            return level <= previousLevel + 1;
          }),
        ),
      ).toBe(true);
      expect(
        await page
          .locator("figure img")
          .evaluateAll((images) =>
            images.every(
              (image) => (image as HTMLImageElement).alt.trim().length > 0,
            ),
          ),
      ).toBe(true);

      await page.locator("body").focus();
      await page.keyboard.press("Tab");
      expect(
        await page
          .locator(":focus")
          .evaluate((element) => ["A", "BUTTON"].includes(element.tagName)),
      ).toBe(true);
    }
  });
});

test.describe("pilot staging routes on mobile", () => {
  test.use({
    isMobile: true,
    viewport: { height: 812, width: 375 },
  });

  test("does not overflow the 375px viewport outside table scroll wrappers", async ({
    page,
  }) => {
    for (const lesson of lessons) {
      await page.goto(lesson.path);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth === window.innerWidth,
        ),
      ).toBe(true);
      expect(await page.evaluate(() => window.innerWidth)).toBe(375);
      const overflowingElements = await page
        .locator("*")
        .evaluateAll((elements) => {
          const viewportWidth = window.innerWidth;
          return elements.flatMap((element) => {
            if (!(element instanceof HTMLElement)) return [];
            if (element.offsetWidth <= viewportWidth) return [];
            const tableWrapper = element.closest('[role="region"]');
            if (
              tableWrapper !== null &&
              tableWrapper.parentElement?.contains(element) === true
            ) {
              return [];
            }
            return [
              `${element.tagName.toLowerCase()}.${element.className} (${element.offsetWidth}px)`,
            ];
          });
        });
      expect(
        overflowingElements,
        `${lesson.path} has content wider than the mobile viewport`,
      ).toEqual([]);
    }
  });
});

async function expectRouteToLoad(page: Page, path: string): Promise<void> {
  const consoleErrors: string[] = [];
  const pageErrors: Error[] = [];
  const onConsole = (message: { text(): string; type(): string }) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  };
  const onPageError = (error: Error) => pageErrors.push(error);

  page.on("console", onConsole);
  page.on("pageerror", onPageError);
  const response = await page.goto(path);
  expect(response?.status(), path).toBe(200);
  expect(consoleErrors, `${path} emitted console.error`).toEqual([]);
  expect(pageErrors, `${path} emitted an uncaught page error`).toEqual([]);
  page.off("console", onConsole);
  page.off("pageerror", onPageError);
}

function readRemediationQueue(relativePath: string): RemediationQueueEntry[] {
  return JSON.parse(
    readFileSync(path.join(process.cwd(), relativePath), "utf8"),
  ) as RemediationQueueEntry[];
}

interface RemediationQueueEntry {
  issueId: string;
  severity: "blocking" | "warning";
  status: "applied" | "blocked" | "pending-owner-review";
}
