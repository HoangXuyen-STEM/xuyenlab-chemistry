import { describe, expect, it } from "vitest";

import {
  loadPilotLibrary,
  normalizeSearchText,
  parsePilotFrontmatter,
  searchPilotLessons,
  type PilotLibraryLesson,
} from "./library";

describe("P5 pilot library metadata", () => {
  it("loads approved in-review metadata and derives current QA counts", () => {
    const lessons = loadPilotLibrary();

    expect(lessons).toHaveLength(2);
    expect(lessons.every((lesson) => lesson.status === "in_review")).toBe(true);
    expect(lessons.every((lesson) => lesson.unresolvedBlocking > 0)).toBe(true);
    expect(lessons.map((lesson) => lesson.href)).toEqual([
      "/fixtures/pilot/chuyen-de-06/dong-hoa-hoc",
      "/fixtures/pilot/chuyen-de-08/dung-dich-va-can-bang-hoa-hoc",
    ]);
  });

  it("normalizes Vietnamese diacritics and đ", () => {
    expect(normalizeSearchText("Động hóa học")).toBe("dong hoa hoc");
    expect(normalizeSearchText("CÂN BẰNG")).toBe("can bang");
  });

  it("ranks title, keywords, summary and topic matches in that order", () => {
    const lessons = [
      lesson({ slug: "topic", topicTitle: "Truy vấn" }),
      lesson({ slug: "summary", summary: "Truy vấn trong tóm tắt" }),
      lesson({ slug: "keyword", keywords: ["truy vấn"] }),
      lesson({ slug: "title", title: "Truy vấn tiêu đề" }),
    ];

    expect(
      searchPilotLessons(lessons, "truy van").map(({ slug }) => slug),
    ).toEqual(["title", "keyword", "summary", "topic"]);
  });

  it("rejects malformed required frontmatter visibly", () => {
    expect(() =>
      parsePilotFrontmatter("---\ntitle: Missing fields\n---\n", "bad.mdx"),
    ).toThrow("bad.mdx: thiếu metadata topic");
  });
});

function lesson(overrides: Partial<PilotLibraryLesson>): PilotLibraryLesson {
  return {
    topic: "chuyen-de-06",
    topicTitle: "Khác",
    topicOrder: 6,
    title: "Khác",
    slug: "lesson",
    order: 1,
    summary: "Khác",
    keywords: ["khác"],
    estimatedMinutes: 1,
    version: 1,
    status: "in_review",
    unresolvedBlocking: 0,
    unresolvedWarnings: 0,
    href: "/fixtures/pilot/example",
    ...overrides,
  };
}
