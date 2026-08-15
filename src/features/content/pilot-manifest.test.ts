import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  getPilotLessonManifest,
  listPilotLessonManifests,
  type PilotLessonManifestEntry,
} from "./pilot-manifest";

describe("pilot manifest", () => {
  it("lists all four manifest lessons", () => {
    const lessons = listPilotLessonManifests();
    expect(lessons).toHaveLength(4);
  });

  it("resolves the Topic 2 lesson with its provenance and QA counts (P6-B2.2)", () => {
    const entry = getPilotLessonManifest("chuyen-de-02", "bang-tuan-hoan");
    expect(entry.sourceId).toBe("T02-S01");
    expect(entry.blockingCount).toBe(1);
    expect(entry.warningCount).toBe(2);
    expect(entry.status).toBe("in_review");
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

  it("reports each pilot lesson's own lifecycle status, matching the real manifest", () => {
    // Derives expectations from the real manifest file rather than
    // hardcoding a status per slug, so this stays valid whichever lifecycle
    // stage each lesson is currently at (e.g. once P6-B1.4 promotes Topic 24
    // from draft to in_review for real).
    const manifest = JSON.parse(
      readFileSync(
        path.join(process.cwd(), "content/pilot-staging-manifest.json"),
        "utf8",
      ),
    ) as { lessons: PilotLessonManifestEntry[] };
    expect(manifest.lessons.length).toBeGreaterThan(0);

    for (const entry of manifest.lessons) {
      expect(getPilotLessonManifest(entry.topic, entry.slug).status).toBe(
        entry.status,
      );
    }
  });
});
