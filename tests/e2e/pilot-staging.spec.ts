import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";

const lessons = [
  {
    // P6-B2.0: Topic 2 has 1 blocking item (the drawing) and 2 warnings
    // (image, table), exercising the same shared assertions with a
    // draft-status, non-zero-blocking lesson.
    path: "/fixtures/pilot/chuyen-de-02/bang-tuan-hoan",
    remediationQueuePath:
      "content/qa/pending/bang-tuan-hoan.remediation-queue.json",
    title: "Bảng tuần hoàn",
  },
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
  // Derived from the real manifest, not hardcoded, so this stays correct
  // for T06/T08 (already in_review) and for Topic 24 once P6-B1.4 promotes
  // it for real -- the banner label the test expects is whatever the real
  // manifest currently says, not an assumption about who is draft today.
  manifestStatus: readManifestStatus(lesson.path),
}));

const BANNER_LABEL: Record<"draft" | "in_review", string> = {
  draft:
    "[BẢN NHÁP PILOT] — Xem trước staging, không cần đăng nhập — chưa xuất bản",
  in_review:
    "[BẢN ĐANG DUYỆT] — Xem trước staging, không cần đăng nhập — chưa xuất bản",
};

test.describe("pilot staging routes", () => {
  test("shows the decorative banner matching each lesson's own current manifest lifecycle status (P6-B1.3U)", async ({
    page,
  }) => {
    // Derived from the real manifest per lesson (lessons[].manifestStatus),
    // not hardcoded to "T06/T08 are in_review, T24 is draft" -- this stays
    // correct after a future P6-B1.4 promotes any of these lessons for real.
    for (const lesson of lessons) {
      await page.goto(lesson.path);
      const expectedText = BANNER_LABEL[lesson.manifestStatus];
      const otherStatus: "draft" | "in_review" =
        lesson.manifestStatus === "draft" ? "in_review" : "draft";
      await expect(page.getByText(expectedText, { exact: true })).toHaveCount(
        1,
      );
      await expect(
        page.getByText(BANNER_LABEL[otherStatus], { exact: true }),
      ).toHaveCount(0);
    }
  });

  test("never labels a draft or in_review lesson as published, approved or production-ready (P6-B1.3U)", async ({
    page,
  }) => {
    for (const lesson of lessons) {
      await page.goto(lesson.path);
      const banner = page.getByText(BANNER_LABEL[lesson.manifestStatus], {
        exact: true,
      });
      const text = (await banner.textContent()) ?? "";
      for (const forbidden of [
        "đã xuất bản",
        "đã phê duyệt",
        "approved",
        "published",
        "công khai",
      ]) {
        expect(text).not.toContain(forbidden);
      }
      expect(text).toContain("chưa xuất bản");
    }
  });

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
          return (
            callout.textContent?.match(/T0(?:2|6|8)-S01:[a-z0-9]+/gu) ?? []
          );
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

  test("keeps Topic 2's two warning-severity fallbacks (image, table) visible with their exact issue IDs traceable (P6-B2.0)", async ({
    page,
  }) => {
    // The blocking-only coverage above proves the drawing's 1 blocking
    // Callout; it does not prove the 2 warning items (image, table) are
    // visible, since they render as ChemFigure/DataTable, not a Callout.
    // Trace each exact ID's own recorded evidence straight through to the
    // rendered DOM instead, same pattern as Topic 24's own warning test.
    const report = readFailureReport(
      "content/qa/import-reports/bang-tuan-hoan.failure.json",
    );
    const targetIds = ["T02-S01:i6022", "T02-S01:t7931"];
    const blocksById = new Map(report.blocks.map((block) => [block.id, block]));
    for (const id of targetIds) {
      expect(blocksById.has(id), `${id} missing from the failure report`).toBe(
        true,
      );
    }

    await page.goto("/fixtures/pilot/chuyen-de-02/bang-tuan-hoan");

    // T02-S01:i6022 — image fallback stays visible at its exact recorded
    // content-addressed asset path.
    const assetPath = blocksById.get("T02-S01:i6022")?.fallback?.assetPath;
    expect(
      assetPath,
      "T02-S01:i6022 has no recorded fallback.assetPath",
    ).toBeTruthy();
    await expect(
      page.locator(`figure img[src="${assetPath}"]`),
      "T02-S01:i6022's recorded asset must remain visible",
    ).toBeVisible();

    // T02-S01:t7931 — the flattened table fallback has no asset path; prove
    // it stays visible by checking the rendered table's text contains the
    // failure report's own recorded source text for that exact ID.
    const table = page.locator("table");
    await expect(
      table,
      "T02-S01:t7931's table must remain visible",
    ).toBeVisible();
    const recordedText =
      blocksById.get("T02-S01:t7931")?.sourceLocator?.textAnchor;
    expect(
      recordedText,
      "T02-S01:t7931 has no recorded sourceLocator.textAnchor",
    ).toBeTruthy();
    const tableText = normalizeWhitespace(await table.innerText());
    expect(
      tableText,
      "rendered table text must contain T02-S01:t7931's recorded source text",
    ).toContain(normalizeWhitespace(recordedText!));
  });

  test("shows Topic 24's three real accepted-with-limitation dispositions, with no misleading fixed/verified/published copy (P6-B1.4)", async ({
    page,
  }) => {
    await page.goto("/fixtures/pilot/chuyen-de-24/phan-bon-hoa-hoc");

    const section = page.getByRole("region", {
      name: "Giới hạn được Chủ dự án chấp nhận",
    });
    await expect(section).toBeVisible();
    for (const id of ["T24-S01:t6971", "T24-S01:i8191", "T24-S01:i0305"]) {
      await expect(section.getByText(id)).toBeVisible();
    }
    await expect(section).toContainText(
      "chưa có mô tả thay thế (alt text) mới hay cải thiện khả năng tiếp cận nào được thêm vào",
    );
    const text = ((await section.textContent()) ?? "").toLowerCase();
    for (const forbidden of [
      "resolved",
      "fixed",
      "accessibility improved",
      "published",
      "đã sửa",
      "đã khắc phục",
      "đã xuất bản",
    ]) {
      expect(text).not.toContain(forbidden.toLowerCase());
    }
  });

  test("hides staging controls but retains lesson content in print media", async ({
    page,
  }) => {
    for (const lesson of lessons) {
      await page.goto(lesson.path);
      await page.emulateMedia({ media: "print" });

      await expect(page.locator("h1")).toBeVisible();
      const bannerText = BANNER_LABEL[lesson.manifestStatus];
      expect(
        await page
          .locator("div")
          .filter({ hasText: new RegExp(`^${escapeRegExp(bannerText)}$`, "u") })
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

  test("keeps the staging limitation notice visible in print media, unlike the decorative banner", async ({
    page,
  }) => {
    for (const lesson of lessons) {
      await page.goto(lesson.path);
      await page.emulateMedia({ media: "print" });

      const notice = page.getByRole("note", { name: "Lưu ý bản đang duyệt" });
      await expect(notice).toContainText(/sử dụng dưới hướng dẫn giáo viên/u);
      expect(
        await notice.evaluate((element) => getComputedStyle(element).display),
      ).not.toBe("none");
      expect(
        await notice.evaluate(
          (element) => (element as HTMLElement).offsetParent !== null,
        ),
      ).toBe(true);

      await page.emulateMedia({ media: "screen" });
    }
  });

  test("shows the staging limitation notice as a visible, labelled, non-interactive note on every lesson page (P6-B1.3U)", async ({
    page,
  }) => {
    for (const lesson of lessons) {
      await page.goto(lesson.path);
      const notice = page.getByRole("note", { name: "Lưu ý bản đang duyệt" });
      await expect(notice).toBeVisible();
      await expect(notice).toContainText(
        "Bản đang duyệt — sử dụng dưới hướng dẫn giáo viên. Một số giới hạn " +
          "chuyển đổi được giữ theo nguồn và không phải nội dung khoa học " +
          "mới do hệ thống xác nhận.",
      );
      // Not hidden behind interaction: no click/expand needed to see it, and
      // it contains no interactive control of its own.
      await expect(notice.locator("button, a, summary")).toHaveCount(0);
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

  test("keeps the staging limitation notice visible at 375px", async ({
    page,
  }) => {
    for (const lesson of lessons) {
      await page.goto(lesson.path);
      await expect(
        page.getByRole("note", { name: "Lưu ý bản đang duyệt" }),
      ).toBeVisible();
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

function readManifestStatus(routePath: string): "draft" | "in_review" {
  const [topic, slug] = routePath.replace("/fixtures/pilot/", "").split("/");
  const manifest = JSON.parse(
    readFileSync(
      path.join(process.cwd(), "content/pilot-staging-manifest.json"),
      "utf8",
    ),
  ) as { lessons: Array<{ topic: string; slug: string; status: string }> };
  const entry = manifest.lessons.find(
    (lesson) => lesson.topic === topic && lesson.slug === slug,
  );
  if (!entry || (entry.status !== "draft" && entry.status !== "in_review")) {
    throw new Error(`no draft/in_review manifest entry for ${routePath}`);
  }
  return entry.status;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function normalizeWhitespace(value: string): string {
  // The recorded sourceLocator.textAnchor concatenates DOCX cell text with no
  // separator at all, while the rendered table naturally inserts whitespace
  // at cell/row boundaries; strip all whitespace on both sides rather than
  // collapsing it, so the comparison is insensitive to that reflow. Also
  // strip leading-hyphen bullet markers ("- Tính kim loại...") since MDX
  // parses a cell paragraph starting with "- " as a markdown list, and a
  // rendered `<li>` bullet marker is not part of `innerText` the way the
  // literal "-" character is in the DOCX-derived source text (observed on
  // Topic 2's table, P6-B2.0).
  return value.replace(/[\s-]+/gu, "");
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
