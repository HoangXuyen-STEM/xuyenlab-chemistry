// @vitest-environment node

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "vitest";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");
const manifest = readJson<PilotManifest>("content/pilot-staging-manifest.json");

const requiredFrontmatterFields = [
  "topic",
  "title",
  "slug",
  "order",
  "summary",
  "keywords",
  "estimatedMinutes",
  "sourceFiles",
  "sourceId",
  "sourcePath",
  "section",
  "version",
  "status",
] as const;

describe("P4 pilot content regression", () => {
  test("canonical MDX frontmatter contains every required content-contract field", () => {
    for (const lesson of manifest.lessons) {
      const frontmatter = extractFrontmatter(readText(lesson.mdxPath));

      for (const field of requiredFrontmatterFields) {
        expect(frontmatter, `${lesson.mdxPath} is missing ${field}`).toMatch(
          fieldPattern(field),
        );
      }
      expect(frontmatter).toMatch(/^status: (draft|in_review|published)$/mu);
    }
  });

  test("manifest MDX hashes match canonical lesson files", () => {
    for (const lesson of manifest.lessons) {
      expect(sha256(readText(lesson.mdxPath)), lesson.mdxPath).toBe(
        lesson.mdxSha256,
      );
    }
  });

  test("no-login fixture body.mdx stays byte-identical to canonical MDX minus frontmatter", () => {
    // Each /fixtures/pilot/<topic>/<slug>/body.mdx is documented (in the
    // page.tsx that imports it) as a byte-identical copy of the canonical
    // lesson MDX with its YAML frontmatter removed, because this project's
    // MDX pipeline has no remark-frontmatter plugin. Prove that mechanically
    // instead of trusting the comment: if a canonical file changes (P6-B1.x
    // re-import, remediation edit, etc.) without regenerating the fixture
    // copy, this must fail loudly rather than silently drift.
    const checked: string[] = [];
    for (const lesson of manifest.lessons) {
      const fixtureBodyPath = `src/app/fixtures/pilot/${lesson.topic}/${lesson.slug}/body.mdx`;
      if (!existsSync(path.join(repoRoot, fixtureBodyPath))) continue;
      checked.push(fixtureBodyPath);

      const canonical = readText(lesson.mdxPath);
      const canonicalBody = canonical.replace(
        /^---\r?\n[\s\S]*?\r?\n---\r?\n(?:\r?\n)?/u,
        "",
      );
      expect(
        canonicalBody,
        `${lesson.mdxPath}: could not locate a closing frontmatter fence`,
      ).not.toBe(canonical);

      expect(
        readText(fixtureBodyPath),
        `${fixtureBodyPath} has drifted from the canonical body of ${lesson.mdxPath}`,
      ).toBe(canonicalBody);
    }
    // This regression is only meaningful if it actually checked something;
    // an empty loop (e.g. every fixture path renamed away) must not pass
    // silently.
    expect(checked.length).toBeGreaterThan(0);
  });

  test("every QA-report asset path resolves under public", () => {
    for (const lesson of manifest.lessons) {
      const report = readJson<FailureReport>(lesson.failureReportPath);
      for (const block of report.blocks) {
        const assetPath = block.fallback?.assetPath;
        if (!assetPath) continue;

        expect(
          assetPath,
          `${lesson.failureReportPath} asset must be public`,
        ).toMatch(/^\/staging-assets\//u);
        expect(
          existsSync(path.join(repoRoot, "public", assetPath)),
          `${lesson.failureReportPath} references missing ${assetPath}`,
        ).toBe(true);
      }
    }
  });

  test("failure-report issue IDs are unique within each lesson", () => {
    for (const lesson of manifest.lessons) {
      const report = readJson<FailureReport>(lesson.failureReportPath);
      const issueIds = report.blocks
        .filter((block) => block.outcome === "fallback")
        .map((block) => block.id);

      expect(
        issueIds,
        `${lesson.failureReportPath} contains duplicate issue IDs`,
      ).toHaveLength(new Set(issueIds).size);
      expect(
        issueIds.every((issueId) => /^T\d{2}-S\d{2}:[a-z0-9]+$/u.test(issueId)),
      ).toBe(true);
    }
  });

  test("every failure-report issue is present in the pending QA record", () => {
    for (const lesson of manifest.lessons) {
      const report = readJson<FailureReport>(lesson.failureReportPath);
      const pendingQa = readJson<PendingQaRecord>(lesson.qaPath);
      const pendingIds = new Set(pendingQa.unresolved.map((issue) => issue.id));

      for (const block of report.blocks.filter(
        (candidate) => candidate.outcome === "fallback",
      )) {
        expect(
          pendingIds.has(block.id),
          `${lesson.failureReportPath} issue ${block.id} is absent from ${lesson.qaPath}`,
        ).toBe(true);
      }
    }
  });

  test("manifest blocking counts equal the corresponding failure-report totals", () => {
    for (const lesson of manifest.lessons) {
      const report = readJson<FailureReport>(lesson.failureReportPath);
      const actualBlockingCount = report.blocks.filter(
        (block) => block.severity === "blocking",
      ).length;

      expect(actualBlockingCount, lesson.failureReportPath).toBe(
        lesson.blockingCount,
      );
    }
  });

  test("remediation dispositions preserve every blocking fallback's MDX traceability", () => {
    for (const lesson of manifest.lessons) {
      const report = readJson<FailureReport>(lesson.failureReportPath);
      const remediationQueue = readJson<RemediationQueueEntry[]>(
        `content/qa/pending/${lesson.slug}.remediation-queue.json`,
      );
      const mdx = readText(lesson.mdxPath);
      const calloutBlocks = Array.from(
        mdx.matchAll(/<Callout\b[\s\S]*?<\/Callout>/gu),
        (match) => match[0],
      );
      const fallbackBlocks = report.blocks.filter(
        (block) => block.outcome === "fallback",
      );

      expect(
        remediationQueue.map((entry) => entry.issueId).sort(),
        `${lesson.slug} remediation queue must cover every importer fallback`,
      ).toEqual(fallbackBlocks.map((block) => block.id).sort());

      for (const entry of remediationQueue) {
        // Warning-only table review items remain traceable through the queue and
        // failure report. The content validator's MDX traceability contract is
        // intentionally limited to blocking fallbacks.
        if (entry.severity !== "blocking") continue;

        const matchingCallouts = calloutBlocks.filter((block) =>
          block.includes(entry.issueId),
        );
        expect(
          mdx,
          `${entry.issueId} must remain traceable in canonical MDX`,
        ).toContain(entry.issueId);

        if (entry.status === "applied") {
          expect(entry.remediationChoice, entry.issueId).toBe(
            "reviewed-latex-mdx",
          );
          expect(entry.ownerDecision.decidedBy, entry.issueId).toBeTruthy();
          expect(entry.ownerDecision.decidedAt, entry.issueId).toBeTruthy();
          expect(entry.ownerDecision.reviewedLatex, entry.issueId).toBeTruthy();
          expect(
            matchingCallouts,
            `${entry.issueId} was applied and must not remain a fallback Callout`,
          ).toHaveLength(0);
        } else {
          expect(
            matchingCallouts,
            `${entry.issueId} is ${entry.status} and must remain visibly represented`,
          ).toHaveLength(1);

          if (entry.status === "blocked") {
            // Both are recognized legacy "blocked" choices (see
            // scripts/validate-content/validate.py's REMEDIATION_NEW_STATUS
            // comment): "reviewed-image-fallback" (T08) and "remain-blocking"
            // (T02, P6-B2.2 -- the Owner accepts the visible Callout as-is
            // without authoring a replacement, keeping the item blocking).
            expect(
              ["reviewed-image-fallback", "remain-blocking"],
              entry.issueId,
            ).toContain(entry.remediationChoice);
            expect(entry.ownerDecision.decidedBy, entry.issueId).toBeTruthy();
            expect(entry.ownerDecision.decidedAt, entry.issueId).toBeTruthy();
            expect(entry.ownerDecision.qaNote, entry.issueId).toBeTruthy();
          }
        }
      }
    }
  });
});

function extractFrontmatter(mdx: string): string {
  const match = /^---\n([\s\S]*?)\n---\n/u.exec(mdx);
  expect(match, "MDX frontmatter is missing").not.toBeNull();
  return match![1];
}

function fieldPattern(
  field: (typeof requiredFrontmatterFields)[number],
): RegExp {
  if (field === "sourceId" || field === "sourcePath" || field === "section") {
    return new RegExp(`^\\s+(?:- )?${field}:\\s+.+$`, "mu");
  }
  return new RegExp(`^${field}:\\s+.+$`, "mu");
}

function readJson<T>(relativePath: string): T {
  return JSON.parse(readText(relativePath)) as T;
}

function readText(relativePath: string): string {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function sha256(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

interface PilotManifest {
  lessons: Array<{
    blockingCount: number;
    failureReportPath: string;
    mdxPath: string;
    mdxSha256: string;
    qaPath: string;
    slug: string;
    topic: string;
  }>;
}

interface FailureReport {
  blocks: Array<{
    fallback?: { assetPath?: string };
    id: string;
    outcome: "fallback" | "semantic";
    severity?: "blocking" | "warning";
  }>;
}

interface PendingQaRecord {
  unresolved: Array<{ id: string }>;
}

interface RemediationQueueEntry {
  issueId: string;
  ownerDecision: {
    decidedAt: string | null;
    decidedBy: string | null;
    qaNote: string | null;
    reviewedLatex: string | null;
  };
  remediationChoice: "reviewed-image-fallback" | "reviewed-latex-mdx" | null;
  severity: "blocking" | "warning";
  status: "applied" | "blocked" | "pending-owner-review";
}
