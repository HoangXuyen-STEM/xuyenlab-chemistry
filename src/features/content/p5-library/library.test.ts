import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import manifestJson from "../../../../content/pilot-staging-manifest.json";

import {
  loadPilotLibrary,
  normalizeSearchText,
  parsePilotFrontmatter,
  searchPilotLessons,
  type PilotLibraryManifest,
  type PilotLibraryLesson,
} from "./library";

const stagingManifest = manifestJson as PilotLibraryManifest;

describe("P5 pilot library metadata", () => {
  it("loads every manifest lesson currently in_review and keeps drafts excluded", () => {
    const lessons = loadPilotLibrary();
    const inReviewEntries = stagingManifest.lessons.filter(
      (entry) => entry.status === "in_review",
    );
    const draftEntries = stagingManifest.lessons.filter(
      (entry) => entry.status === "draft",
    );

    expect(lessons.map((lesson) => lesson.slug)).toEqual(
      inReviewEntries.map((entry) => entry.slug),
    );
    expect(lessons.every((lesson) => lesson.status === "in_review")).toBe(true);
    expect(lessons.every((lesson) => lesson.unresolvedBlocking > 0)).toBe(true);
    expect(lessons.map((lesson) => lesson.href)).toEqual([
      "/fixtures/pilot/chuyen-de-06/dong-hoa-hoc",
      "/fixtures/pilot/chuyen-de-08/dung-dich-va-can-bang-hoa-hoc",
    ]);
    expect(draftEntries.map((entry) => entry.slug)).not.toContain(
      "dong-hoa-hoc",
    );
    expect(lessons.map((lesson) => lesson.slug)).not.toContain(
      "phan-bon-hoa-hoc",
    );
  });

  it("filters out draft manifest entries instead of throwing or reading their files", () => {
    const lessons = loadPilotLibrary({
      lessons: [
        {
          mdxPath: "content/topics/chuyen-de-99/does-not-exist.mdx",
          qaPath: "content/qa/pending/does-not-exist.json",
          slug: "does-not-exist",
          topic: "chuyen-de-99",
          status: "draft",
        },
      ],
    });

    expect(lessons).toEqual([]);
  });

  it("loads a manifest-backed Topic 24 when only its isolated lifecycle view is promoted", () => {
    const topic24 = stagingManifest.lessons.find(
      (entry) => entry.slug === "phan-bon-hoa-hoc",
    );
    expect(topic24?.status).toBe("draft");

    const promotedManifest: PilotLibraryManifest = {
      lessons: stagingManifest.lessons.map((entry) =>
        entry.slug === "phan-bon-hoa-hoc"
          ? { ...entry, status: "in_review" }
          : { ...entry },
      ),
    };
    const lessons = loadPilotLibrary(promotedManifest, (repositoryPath) => {
      const source = readFileSync(
        path.join(process.cwd(), repositoryPath),
        "utf8",
      );
      return repositoryPath === topic24?.mdxPath
        ? source.replace("status: draft", "status: in_review")
        : source;
    });

    expect(lessons.map((lesson) => lesson.slug)).toContain("phan-bon-hoa-hoc");
    expect(
      lessons.find((lesson) => lesson.slug === "phan-bon-hoa-hoc"),
    ).toMatchObject({
      href: "/fixtures/pilot/chuyen-de-24/phan-bon-hoa-hoc",
      status: "in_review",
    });
    expect(topic24?.status).toBe("draft");
  });

  it.each([
    [
      "an undeclared lesson path",
      {
        ...stagingManifest.lessons[0],
        mdxPath: "content/topics/chuyen-de-06/not-declared.mdx",
      },
    ],
    [
      "a traversal path",
      {
        ...stagingManifest.lessons[0],
        mdxPath: "content/topics/chuyen-de-06/../dong-hoa-hoc.mdx",
      },
    ],
    [
      "an unsupported QA path family",
      {
        ...stagingManifest.lessons[0],
        qaPath: "content/qa/import-reports/dong-hoa-hoc.failure.json",
      },
    ],
    [
      "a malformed lifecycle status",
      { ...stagingManifest.lessons[0], status: "published" },
    ],
  ] as const)("rejects %s before reading a repository file", (_, entry) => {
    expect(() =>
      loadPilotLibrary({ lessons: [entry] } as PilotLibraryManifest),
    ).toThrow(/manifest.*không hợp lệ|đường dẫn manifest không an toàn/iu);
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
