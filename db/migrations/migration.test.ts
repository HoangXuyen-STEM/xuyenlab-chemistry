import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("P3 backend migration", () => {
  it("creates all frozen backend entities and database guards", async () => {
    const sql = await readFile(
      new URL("./0000_p3_backend.sql", import.meta.url),
      "utf8",
    );

    expect(sql).toContain('CREATE TABLE "profiles"');
    expect(sql).toContain('CREATE TABLE "allowed_students"');
    expect(sql).toContain('CREATE TABLE "lesson_progress"');
    expect(sql).toContain('CREATE TABLE "bookmarks"');
    expect(sql).toContain("lesson_progress_read_percent_check");
    expect(sql).toContain("bookmarks_user_lesson_anchor_unique");
  });
});
