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
  {
    // P6-B1.2: Topic 24 has 0 blocking items (all 3 unresolved items are
    // warning-severity), so this lesson exercises the zero-blocking-callout
    // path through the same shared assertions as the two pilots.
    path: "/fixtures/pilot/chuyen-de-24/phan-bon-hoa-hoc",
    remediationQueuePath:
      "content/qa/pending/phan-bon-hoa-hoc.remediation-queue.json",
    title: "Phân bón hóa học",
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
  test("loads every lesson and the pilot index without client errors", async ({
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

  test("keeps Topic 24's three warning-severity fallbacks visible with their exact issue IDs traceable", async ({
    page,
  }) => {
    // Blocking-only coverage above cannot prove this: Topic 24 has 0
    // blocking items, so its 3 warnings (1 table, 2 images) never produce a
    // fallback Callout to match against. Trace each exact ID's own recorded
    // evidence (asset path / source text) from the failure report straight
    // through to the rendered DOM instead.
    const report = readFailureReport(
      "content/qa/import-reports/phan-bon-hoa-hoc.failure.json",
    );
    const targetIds = ["T24-S01:t6971", "T24-S01:i8191", "T24-S01:i0305"];
    const blocksById = new Map(report.blocks.map((block) => [block.id, block]));
    for (const id of targetIds) {
      expect(blocksById.has(id), `${id} missing from the failure report`).toBe(
        true,
      );
    }

    await page.goto("/fixtures/pilot/chuyen-de-24/phan-bon-hoa-hoc");

    // T24-S01:i8191 / T24-S01:i0305 — image fallbacks stay visible at their
    // exact recorded content-addressed asset path.
    for (const id of ["T24-S01:i8191", "T24-S01:i0305"]) {
      const assetPath = blocksById.get(id)?.fallback?.assetPath;
      expect(
        assetPath,
        `${id} has no recorded fallback.assetPath`,
      ).toBeTruthy();
      await expect(
        page.locator(`figure img[src="${assetPath}"]`),
        `${id}'s recorded asset must remain visible`,
      ).toBeVisible();
    }

    // T24-S01:t6971 — the flattened table fallback has no asset path; prove
    // it stays visible by checking the rendered table's text contains the
    // failure report's own recorded source text for that exact ID
    // (whitespace-normalized, since a table renders as a two-dimensional
    // grid rather than the DOCX's single flat run of text).
    const table = page.locator("table");
    await expect(
      table,
      "T24-S01:t6971's table must remain visible",
    ).toBeVisible();
    const recordedText =
      blocksById.get("T24-S01:t6971")?.sourceLocator?.textAnchor;
    expect(
      recordedText,
      "T24-S01:t6971 has no recorded sourceLocator.textAnchor",
    ).toBeTruthy();
    const tableText = normalizeWhitespace(await table.innerText());
    expect(
      tableText,
      "rendered table text must contain T24-S01:t6971's recorded source text",
    ).toContain(normalizeWhitespace(recordedText!));
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

function readFailureReport(relativePath: string): FailureReport {
  return JSON.parse(
    readFileSync(path.join(process.cwd(), relativePath), "utf8"),
  ) as FailureReport;
}

function normalizeWhitespace(value: string): string {
  // The recorded sourceLocator.textAnchor concatenates DOCX cell text with no
  // separator at all, while the rendered table naturally inserts whitespace
  // at cell/row boundaries; strip all whitespace on both sides rather than
  // collapsing it, so the comparison is insensitive to that reflow.
  return value.replace(/\s+/gu, "");
}

interface RemediationQueueEntry {
  issueId: string;
  severity: "blocking" | "warning";
  status: "applied" | "blocked" | "pending-owner-review";
}

interface FailureReport {
  blocks: Array<{
    fallback?: { assetPath?: string };
    id: string;
    sourceLocator?: { textAnchor?: string };
  }>;
}
