import { describe, expect, it } from "vitest";

import {
  selectPdfEligibleLessons,
  type PilotManifestLesson,
} from "../../scripts/generate-pdf/generate";

function lesson(overrides: Partial<PilotManifestLesson>): PilotManifestLesson {
  return {
    mdxPath: "content/topics/chuyen-de-06/lesson.mdx",
    slug: "lesson",
    topic: "chuyen-de-06",
    status: "in_review",
    ...overrides,
  };
}

describe("selectPdfEligibleLessons", () => {
  it("plans only in_review lessons from a mixed draft/in_review manifest", () => {
    const draft = lesson({ slug: "draft-lesson", status: "draft" });
    const inReview = lesson({ slug: "in-review-lesson", status: "in_review" });

    expect(selectPdfEligibleLessons([draft, inReview])).toEqual([inReview]);
  });

  it("returns an empty plan set (not a throw) when every lesson is draft", () => {
    expect(selectPdfEligibleLessons([lesson({ status: "draft" })])).toEqual([]);
  });

  it("plans every lesson when all are in_review, matching current production", () => {
    const lessons = [lesson({ slug: "a" }), lesson({ slug: "b" })];
    expect(selectPdfEligibleLessons(lessons)).toEqual(lessons);
  });
});
