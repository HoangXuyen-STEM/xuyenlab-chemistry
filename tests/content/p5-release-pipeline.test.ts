import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  selectPdfEligibleLessons,
  type PilotManifestLesson,
} from "../../scripts/generate-pdf/generate";

describe("P5 release pipeline integration", () => {
  it("targets exactly the owner-approved in_review subset, derived from the manifest", () => {
    const manifest = JSON.parse(
      readFileSync("content/pilot-staging-manifest.json", "utf8"),
    ) as {
      lessons: PilotManifestLesson[];
    };
    // Uses the real PDF-planning selection function (not a parallel
    // hand-rolled filter), so this test and the actual release pipeline
    // can't silently drift apart on what "eligible" means.
    const eligible = selectPdfEligibleLessons(manifest.lessons);
    const draft = manifest.lessons.filter(
      (lesson) => lesson.status === "draft",
    );
    // These assumptions only mean something if the real manifest currently
    // mixes statuses (Topic 24 draft alongside two in_review pilots, today);
    // a manifest with no draft lessons would make the exclusion check below
    // vacuously true.
    expect(draft.length, "expected at least one draft lesson").toBeGreaterThan(
      0,
    );

    expect(eligible).toEqual(
      manifest.lessons.filter((lesson) => lesson.status === "in_review"),
    );
    // Every draft lesson (Topic 24 today; any future batch lesson tomorrow)
    // must stay out of the PDF-eligible set derived above.
    const eligibleSlugs = new Set(eligible.map((lesson) => lesson.slug));
    for (const draftLesson of draft) {
      expect(
        eligibleSlugs.has(draftLesson.slug),
        `${draftLesson.slug} is draft and must be excluded from PDF planning`,
      ).toBe(false);
    }

    for (const lesson of eligible) {
      expect(readFileSync(lesson.mdxPath, "utf8")).toMatch(
        /\nstatus: in_review\n/,
      );
    }
  });

  it("keeps PR CI credential-free and includes a local PDF dry-run", () => {
    const workflow = readFileSync(".github/workflows/ci.yml", "utf8");
    expect(workflow).toContain("npm run content:validate");
    expect(workflow).toContain("npm run pdf:dry-run");
    expect(workflow).not.toMatch(/R2_(?:ACCOUNT|ACCESS|SECRET|PRIVATE)/);
    expect(workflow).not.toContain("--execute");
  });
});
