import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  selectPdfEligibleLessons,
  type PilotManifestLesson,
} from "../../scripts/generate-pdf/generate";

describe("P5 release pipeline integration", () => {
  it("plans PDFs only for the manifest's in_review lessons, whatever the current draft count is", () => {
    // Uses the real PDF-planning selection function (not a parallel
    // hand-rolled filter), so this test and the actual release pipeline
    // can't silently drift apart on what "eligible" means. Deliberately
    // does not assume a draft lesson currently exists (that count can drop
    // to zero once every batch is promoted) — non-vacuous draft-exclusion
    // coverage lives in the synthetic test below instead.
    const manifest = JSON.parse(
      readFileSync("content/pilot-staging-manifest.json", "utf8"),
    ) as {
      lessons: PilotManifestLesson[];
    };
    const eligible = selectPdfEligibleLessons(manifest.lessons);

    expect(eligible).toEqual(
      manifest.lessons.filter((lesson) => lesson.status === "in_review"),
    );
    for (const lesson of eligible) {
      expect(readFileSync(lesson.mdxPath, "utf8")).toMatch(
        /\nstatus: in_review\n/,
      );
    }
  });

  it("excludes draft lessons from PDF planning, proven with a synthetic mixed-status input", () => {
    // selectPdfEligibleLessons does no file I/O, so a fully synthetic input
    // (fake paths included) is a safe, non-vacuous proof that draft
    // exclusion holds independent of the real manifest's current draft
    // count. "in_review does not imply approvedForPublish:true" — this
    // selector is purely a lifecycle-stage filter, not a publish-approval
    // check, so it must not be read as "PDF-eligible means
    // publication-approved".
    const lessons: PilotManifestLesson[] = [
      {
        mdxPath: "content/topics/chuyen-de-06/synthetic-in-review.mdx",
        slug: "synthetic-in-review",
        topic: "chuyen-de-06",
        status: "in_review",
      },
      {
        mdxPath: "content/topics/chuyen-de-99/synthetic-draft.mdx",
        slug: "synthetic-draft",
        topic: "chuyen-de-99",
        status: "draft",
      },
    ];

    expect(selectPdfEligibleLessons(lessons)).toEqual([
      {
        mdxPath: "content/topics/chuyen-de-06/synthetic-in-review.mdx",
        slug: "synthetic-in-review",
        topic: "chuyen-de-06",
        status: "in_review",
      },
    ]);
  });

  it("keeps PR CI credential-free and includes a local PDF dry-run", () => {
    const workflow = readFileSync(".github/workflows/ci.yml", "utf8");
    expect(workflow).toContain("npm run content:validate");
    expect(workflow).toContain("npm run pdf:dry-run");
    expect(workflow).not.toMatch(/R2_(?:ACCOUNT|ACCESS|SECRET|PRIVATE)/);
    expect(workflow).not.toContain("--execute");
  });
});
