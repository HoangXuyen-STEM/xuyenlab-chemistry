import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import manifestJson from "../../../../content/pilot-staging-manifest.json";

import {
  loadPilotLibrary,
  normalizeSearchText,
  parsePilotFrontmatter,
  resolveRepositoryFilePath,
  searchPilotLessons,
  type PilotLibraryManifest,
  type PilotLibraryLesson,
} from "./library";

const stagingManifest = manifestJson as PilotLibraryManifest;

describe("P5 pilot library metadata", () => {
  it("loads exactly the manifest's real current in_review subset", () => {
    // Deliberately does not assume anything about how many lessons are
    // draft right now (could be zero once every batch is promoted) — only
    // that "library contents" and "manifest in_review subset" stay equal,
    // whatever that subset currently is. Non-vacuous draft-exclusion
    // coverage lives in the synthetic test below instead, so this test
    // stays meaningful even if the real manifest has no draft lesson left.
    const lessons = loadPilotLibrary();
    const inReviewEntries = stagingManifest.lessons.filter(
      (entry) => entry.status === "in_review",
    );

    expect(lessons.map((lesson) => lesson.slug)).toEqual(
      inReviewEntries.map((entry) => entry.slug),
    );
    expect(lessons.every((lesson) => lesson.status === "in_review")).toBe(true);
    // Derived from the manifest's own topic/slug, not a hardcoded Topic 6/8
    // href list — an in_review lesson with 0 blocking items (see the
    // promotion test below) is just as valid as one with many.
    expect(lessons.map((lesson) => lesson.href)).toEqual(
      inReviewEntries.map(
        (entry) => `/fixtures/pilot/${entry.topic}/${entry.slug}`,
      ),
    );
  });

  it("excludes a draft entry from a synthetic mixed-status manifest, independent of the real manifest's current draft count", () => {
    // Fully synthetic: does not depend on any real lesson's current status,
    // and does not require any real draft lesson to exist, so this stays a
    // real (non-vacuous) proof of draft exclusion before, during and after
    // Topic 24 (or any other lesson) is promoted. The "in_review" entry
    // reuses a real, registered topic slug (required — loadPilotLibrary
    // looks it up in content/topics.ts) with an entirely synthetic slug and
    // injected file content, so it never reads or depends on any real file.
    const syntheticFiles: Record<string, string> = {
      "content/topics/chuyen-de-06/synthetic-in-review.mdx": [
        "---",
        "topic: chuyen-de-06",
        "title: Synthetic in_review lesson",
        "slug: synthetic-in-review",
        "order: 999",
        "summary: Synthetic summary for a library unit test.",
        'keywords: ["synthetic"]',
        "estimatedMinutes: 1",
        "version: 1",
        "status: in_review",
        "---",
        "",
        "Synthetic body.",
        "",
      ].join("\n"),
      "content/qa/pending/synthetic-in-review.json": JSON.stringify({
        lessonSlug: "synthetic-in-review",
        unresolved: [],
      }),
    };
    const syntheticManifest: PilotLibraryManifest = {
      lessons: [
        {
          mdxPath: "content/topics/chuyen-de-06/synthetic-in-review.mdx",
          qaPath: "content/qa/pending/synthetic-in-review.json",
          slug: "synthetic-in-review",
          topic: "chuyen-de-06",
          status: "in_review",
        },
        {
          mdxPath: "content/topics/chuyen-de-99/synthetic-draft.mdx",
          qaPath: "content/qa/pending/synthetic-draft.json",
          slug: "synthetic-draft",
          topic: "chuyen-de-99",
          status: "draft",
        },
      ],
    };

    const lessons = loadPilotLibrary(
      syntheticManifest,
      (repositoryPath, allowedPaths) => {
        if (!allowedPaths.has(repositoryPath)) {
          throw new Error(`Đường dẫn fixture không an toàn: ${repositoryPath}`);
        }
        const content = syntheticFiles[repositoryPath];
        if (content === undefined) {
          throw new Error(`unexpected read in test: ${repositoryPath}`);
        }
        return content;
      },
    );

    expect(lessons.map((lesson) => lesson.slug)).toEqual([
      "synthetic-in-review",
    ]);
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

  it("loads a manifest-backed Topic 24 when only its isolated lifecycle view is promoted, without breaking search, order or count for the rest of the library", () => {
    // Rewrites the status line by pattern, not by literal value, so this
    // helper produces the requested status regardless of the file's
    // CURRENT status — unlike a literal `.replace("status: draft", ...)`,
    // which would silently no-op once the real file already says
    // in_review (i.e. after Topic 24 is really promoted in P6-B1.4).
    const withStatus = (source: string, status: "draft" | "in_review") =>
      source.replace(
        /\nstatus: (?:draft|in_review)\n/u,
        `\nstatus: ${status}\n`,
      );

    const topic24 = stagingManifest.lessons.find(
      (entry) => entry.slug === "phan-bon-hoa-hoc",
    );
    if (!topic24) throw new Error("Topic 24 manifest entry không tồn tại.");

    // blockingCount is a QA metric independent of lifecycle status —
    // promoting draft -> in_review doesn't change it, so this assumption
    // stays valid whichever side of P6-B1.4 the real manifest is on.
    // `ManifestLesson` (library.ts) doesn't carry blockingCount, so read it
    // off the raw manifest JSON directly.
    const topic24BlockingCount = manifestJson.lessons.find(
      (entry) => entry.slug === "phan-bon-hoa-hoc",
    )?.blockingCount;
    expect(topic24BlockingCount).toBe(0);

    // Baseline: every OTHER lesson keeps its real current status; Topic 24
    // is forced to draft in this test-local view REGARDLESS of its real
    // current status, so "the library without Topic 24" is a stable,
    // well-defined starting point whether Topic 24 is still draft (today)
    // or has already been promoted for real (after P6-B1.4).
    const baselineManifest: PilotLibraryManifest = {
      lessons: stagingManifest.lessons.map((entry) =>
        entry.slug === topic24.slug
          ? { ...entry, status: "draft" }
          : { ...entry },
      ),
    };
    const previouslyInReviewSlugs = baselineManifest.lessons
      .filter((entry) => entry.status === "in_review")
      .map((entry) => entry.slug);

    const originalTopic24Source = readFileSync(
      path.join(process.cwd(), topic24.mdxPath),
      "utf8",
    );

    const promotedManifest: PilotLibraryManifest = {
      lessons: baselineManifest.lessons.map((entry) =>
        entry.slug === topic24.slug
          ? { ...entry, status: "in_review" }
          : { ...entry },
      ),
    };
    const lessons = loadPilotLibrary(promotedManifest, (repositoryPath) => {
      const source = readFileSync(
        path.join(process.cwd(), repositoryPath),
        "utf8",
      );
      return repositoryPath === topic24.mdxPath
        ? withStatus(source, "in_review")
        : source;
    });

    // Count: promoting exactly one draft lesson (Topic 24, in this
    // test-local baseline) must add exactly one library entry, on top of
    // whatever else was already in_review.
    expect(lessons).toHaveLength(previouslyInReviewSlugs.length + 1);

    // A lesson with zero blocking issues is a legitimate in_review library
    // entry, not a data error the library should reject or miscount.
    expect(
      lessons.find((lesson) => lesson.slug === "phan-bon-hoa-hoc"),
    ).toMatchObject({
      href: "/fixtures/pilot/chuyen-de-24/phan-bon-hoa-hoc",
      status: "in_review",
      unresolvedBlocking: 0,
    });
    // The canonical Topic 24 file on disk is never mutated by promoting
    // only this test-local injected manifest/reader view — proven
    // byte-for-byte, rather than by asserting a specific status literal
    // (which would break the moment Topic 24 is really promoted).
    expect(
      readFileSync(path.join(process.cwd(), topic24.mdxPath), "utf8"),
    ).toBe(originalTopic24Source);

    // Order: an empty query sorts by (topicOrder, order); promotion must
    // not disturb the existing lessons' relative order or displace them.
    const sortedSlugs = searchPilotLessons(lessons, "").map(
      (lesson) => lesson.slug,
    );
    expect(sortedSlugs).toEqual([
      ...previouslyInReviewSlugs,
      "phan-bon-hoa-hoc",
    ]);

    // Search: the newly promoted lesson must be discoverable by its own
    // title, and a query that only matches a pre-existing lesson must still
    // exclude the newly promoted one.
    expect(
      searchPilotLessons(lessons, "phan bon").map((lesson) => lesson.slug),
    ).toEqual(["phan-bon-hoa-hoc"]);
    expect(
      searchPilotLessons(lessons, "dong hoa hoc").map((lesson) => lesson.slug),
    ).toEqual(["dong-hoa-hoc"]);
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

  it("rejects plain ../ traversal against a disposable root, without needing a real filesystem entry", () => {
    const root = mkdtempSync(path.join(tmpdir(), "xuyenlab-repo-root-"));
    try {
      expect(() => resolveRepositoryFilePath("../outside.txt", root)).toThrow(
        /không an toàn/u,
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  // Regular-file symlinks need no special privilege on Linux/macOS; Windows
  // requires elevation or Developer Mode. Probe support once so an
  // unsupported platform skips these two cases with a clear reason instead
  // of failing CI for an unrelated cause — the security claim this module
  // makes (symlink-aware containment) is only actually exercised where the
  // probe succeeds; elsewhere it rests on the lexical `../` check above and
  // code review, not on a passing test.
  const symlinkProbeRoot = mkdtempSync(
    path.join(tmpdir(), "xuyenlab-symlink-probe-"),
  );
  let symlinksSupported = true;
  try {
    symlinkSync(
      path.join(symlinkProbeRoot, "target"),
      path.join(symlinkProbeRoot, "probe-link"),
    );
  } catch {
    symlinksSupported = false;
  } finally {
    rmSync(symlinkProbeRoot, { recursive: true, force: true });
  }

  it.skipIf(!symlinksSupported)(
    "rejects a symlink whose real target escapes the repository root, even though the lexical path is contained",
    () => {
      const root = mkdtempSync(path.join(tmpdir(), "xuyenlab-repo-root-"));
      const outside = mkdtempSync(path.join(tmpdir(), "xuyenlab-outside-"));
      try {
        const secretPath = path.join(outside, "secret.txt");
        writeFileSync(secretPath, "must not be reachable via the repo root");
        mkdirSync(path.join(root, "content/topics/chuyen-de-99"), {
          recursive: true,
        });
        const escapeLinkPath = path.join(
          root,
          "content/topics/chuyen-de-99/escape.mdx",
        );
        symlinkSync(secretPath, escapeLinkPath);

        expect(() =>
          resolveRepositoryFilePath(
            "content/topics/chuyen-de-99/escape.mdx",
            root,
          ),
        ).toThrow(/thoát khỏi repository/u);
      } finally {
        rmSync(root, { recursive: true, force: true });
        rmSync(outside, { recursive: true, force: true });
      }
    },
  );

  it.skipIf(!symlinksSupported)(
    "accepts a symlink whose real target stays inside the repository root",
    () => {
      const root = mkdtempSync(path.join(tmpdir(), "xuyenlab-repo-root-"));
      try {
        mkdirSync(path.join(root, "content/topics/chuyen-de-99"), {
          recursive: true,
        });
        const realFilePath = path.join(
          root,
          "content/topics/chuyen-de-99/real.mdx",
        );
        writeFileSync(realFilePath, "in-bounds content");
        const linkPath = path.join(
          root,
          "content/topics/chuyen-de-99/link.mdx",
        );
        symlinkSync(realFilePath, linkPath);

        expect(() =>
          resolveRepositoryFilePath(
            "content/topics/chuyen-de-99/link.mdx",
            root,
          ),
        ).not.toThrow();
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    },
  );

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
