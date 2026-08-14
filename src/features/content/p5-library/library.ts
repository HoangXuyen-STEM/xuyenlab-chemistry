import { readFileSync } from "node:fs";
import path from "node:path";

import { topics } from "../../../../content/topics";
import manifestJson from "../../../../content/pilot-staging-manifest.json";

export interface PilotLibraryLesson {
  topic: string;
  topicTitle: string;
  topicOrder: number;
  title: string;
  slug: string;
  order: number;
  summary: string;
  keywords: string[];
  estimatedMinutes: number;
  version: number;
  status: "in_review";
  unresolvedBlocking: number;
  unresolvedWarnings: number;
  href: string;
}

interface ManifestLesson {
  mdxPath: string;
  qaPath: string;
  slug: string;
  topic: string;
  status: "draft" | "in_review";
}

interface QaRecord {
  lessonSlug: string;
  unresolved: Array<{ severity: "warning" | "blocking" }>;
}

interface Frontmatter {
  topic: string;
  title: string;
  slug: string;
  order: number;
  summary: string;
  keywords: string[];
  estimatedMinutes: number;
  version: number;
  status: string;
}

const requiredStringFields = [
  "topic",
  "title",
  "slug",
  "summary",
  "status",
] as const;
const requiredNumberFields = ["order", "estimatedMinutes", "version"] as const;

export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/[đĐ]/gu, "d")
    .toLocaleLowerCase("vi")
    .trim();
}

export function searchPilotLessons(
  lessons: PilotLibraryLesson[],
  query: string,
): PilotLibraryLesson[] {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return [...lessons].sort(compareLessonOrder);

  return lessons
    .map((lesson) => ({ lesson, rank: matchRank(lesson, normalizedQuery) }))
    .filter((entry) => entry.rank !== null)
    .sort(
      (left, right) =>
        left.rank! - right.rank! ||
        compareLessonOrder(left.lesson, right.lesson),
    )
    .map(({ lesson }) => lesson);
}

export function parsePilotFrontmatter(
  source: string,
  sourcePath: string,
): Frontmatter {
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u.exec(source);
  if (!match) throw new Error(`${sourcePath}: thiếu frontmatter hợp lệ.`);

  const values = new Map<string, string>();
  for (const line of match[1].split(/\r?\n/u)) {
    const field = /^([A-Za-z][A-Za-z0-9]*):\s*(.*?)\s*$/u.exec(line);
    if (field) values.set(field[1], field[2]);
  }

  for (const field of requiredStringFields) {
    if (!values.get(field))
      throw new Error(`${sourcePath}: thiếu metadata ${field}.`);
  }
  for (const field of requiredNumberFields) {
    if (!/^\d+$/u.test(values.get(field) ?? "")) {
      throw new Error(`${sourcePath}: metadata ${field} phải là số nguyên.`);
    }
  }

  const keywordsRaw = values.get("keywords");
  if (!keywordsRaw) throw new Error(`${sourcePath}: thiếu metadata keywords.`);
  let keywords: unknown;
  try {
    keywords = JSON.parse(keywordsRaw);
  } catch {
    throw new Error(
      `${sourcePath}: metadata keywords không phải mảng JSON hợp lệ.`,
    );
  }
  if (
    !Array.isArray(keywords) ||
    !keywords.every((item) => typeof item === "string")
  ) {
    throw new Error(`${sourcePath}: metadata keywords phải là mảng chuỗi.`);
  }

  return {
    topic: unquote(values.get("topic")!),
    title: unquote(values.get("title")!),
    slug: unquote(values.get("slug")!),
    order: Number(values.get("order")),
    summary: unquote(values.get("summary")!),
    keywords,
    estimatedMinutes: Number(values.get("estimatedMinutes")),
    version: Number(values.get("version")),
    status: unquote(values.get("status")!),
  };
}

/**
 * `manifest` is an injectable override for tests; production callers use the
 * default (the real committed manifest). Only `in_review` lesson entries are
 * read — a `draft` entry (e.g. a newly imported P6-B1 lesson) is silently
 * excluded from this P5 library fixture rather than failing the whole page,
 * since the manifest can now hold lessons at different lifecycle stages
 * (see docs/contracts/content.md "Staging manifest").
 */
export function loadPilotLibrary(
  manifest: { lessons: ManifestLesson[] } = manifestJson as {
    lessons: ManifestLesson[];
  },
): PilotLibraryLesson[] {
  const inReviewLessons = manifest.lessons.filter(
    (entry) => entry.status === "in_review",
  );

  return inReviewLessons.map((entry) => {
    const frontmatter = parsePilotFrontmatter(
      readRepositoryFile(entry.mdxPath),
      entry.mdxPath,
    );
    const qa = JSON.parse(readRepositoryFile(entry.qaPath)) as QaRecord;
    const topic = topics.find(
      (candidate) => candidate.slug === frontmatter.topic,
    );

    if (
      frontmatter.topic !== entry.topic ||
      frontmatter.slug !== entry.slug ||
      qa.lessonSlug !== entry.slug
    ) {
      throw new Error(
        `${entry.slug}: manifest, MDX và QA record không nhất quán.`,
      );
    }
    if (frontmatter.status !== "in_review") {
      throw new Error(
        `${entry.mdxPath}: status phải là in_review cho fixture P5.`,
      );
    }
    if (!topic || !Array.isArray(qa.unresolved)) {
      throw new Error(`${entry.slug}: topic hoặc unresolved QA không hợp lệ.`);
    }

    return {
      ...frontmatter,
      status: "in_review",
      topicTitle: topic.title,
      topicOrder: topic.order,
      unresolvedBlocking: qa.unresolved.filter(
        (item) => item.severity === "blocking",
      ).length,
      unresolvedWarnings: qa.unresolved.filter(
        (item) => item.severity === "warning",
      ).length,
      href: `/fixtures/pilot/${entry.topic}/${entry.slug}`,
    };
  });
}

function readRepositoryFile(repositoryPath: string): string {
  const readers: Record<string, () => string> = {
    "content/topics/chuyen-de-06/dong-hoa-hoc.mdx": () =>
      readFileSync(
        path.join(
          process.cwd(),
          "content/topics/chuyen-de-06/dong-hoa-hoc.mdx",
        ),
        "utf8",
      ),
    "content/topics/chuyen-de-08/dung-dich-va-can-bang-hoa-hoc.mdx": () =>
      readFileSync(
        path.join(
          process.cwd(),
          "content/topics/chuyen-de-08/dung-dich-va-can-bang-hoa-hoc.mdx",
        ),
        "utf8",
      ),
    "content/qa/pending/dong-hoa-hoc.json": () =>
      readFileSync(
        path.join(process.cwd(), "content/qa/pending/dong-hoa-hoc.json"),
        "utf8",
      ),
    "content/qa/pending/dung-dich-va-can-bang-hoa-hoc.json": () =>
      readFileSync(
        path.join(
          process.cwd(),
          "content/qa/pending/dung-dich-va-can-bang-hoa-hoc.json",
        ),
        "utf8",
      ),
  };
  const read = readers[repositoryPath];
  if (!read)
    throw new Error(`Đường dẫn fixture không an toàn: ${repositoryPath}`);
  return read();
}

function unquote(value: string): string {
  if (value.startsWith('"') && value.endsWith('"'))
    return JSON.parse(value) as string;
  return value;
}

function matchRank(lesson: PilotLibraryLesson, query: string): number | null {
  if (normalizeSearchText(lesson.title).includes(query)) return 0;
  if (
    lesson.keywords.some((keyword) =>
      normalizeSearchText(keyword).includes(query),
    )
  )
    return 1;
  if (normalizeSearchText(lesson.summary).includes(query)) return 2;
  if (
    normalizeSearchText(lesson.topicTitle).includes(query) ||
    normalizeSearchText(lesson.topic).includes(query)
  )
    return 3;
  return null;
}

function compareLessonOrder(
  left: PilotLibraryLesson,
  right: PilotLibraryLesson,
): number {
  return left.topicOrder - right.topicOrder || left.order - right.order;
}
