import { describe, expect, it } from "vitest";

import {
  getPilotLessonManifest,
  listPilotLessonManifests,
} from "./pilot-manifest";

describe("pilot manifest", () => {
  it("lists both P4.1 pilot lessons", () => {
    const lessons = listPilotLessonManifests();
    expect(lessons).toHaveLength(2);
  });

  it("resolves the Topic 6 lesson with its provenance and QA counts", () => {
    const entry = getPilotLessonManifest("chuyen-de-06", "dong-hoa-hoc");
    expect(entry.sourceId).toBe("T06-S01");
    expect(entry.blockingCount).toBe(96);
    expect(entry.warningCount).toBe(3);
  });

  it("resolves the Topic 8 lesson with its provenance and QA counts", () => {
    const entry = getPilotLessonManifest(
      "chuyen-de-08",
      "dung-dich-va-can-bang-hoa-hoc",
    );
    expect(entry.sourceId).toBe("T08-S01");
    expect(entry.blockingCount).toBe(126);
    expect(entry.warningCount).toBe(42);
  });

  it("throws for a lesson that is not in the manifest", () => {
    expect(() => getPilotLessonManifest("chuyen-de-99", "unknown")).toThrow();
  });

  it("reports each pilot lesson's own lifecycle status", () => {
    expect(getPilotLessonManifest("chuyen-de-06", "dong-hoa-hoc").status).toBe(
      "in_review",
    );
    expect(
      getPilotLessonManifest("chuyen-de-08", "dung-dich-va-can-bang-hoa-hoc")
        .status,
    ).toBe("in_review");
  });
});
