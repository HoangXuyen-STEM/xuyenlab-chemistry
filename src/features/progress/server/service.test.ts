import { afterEach, describe, expect, it, vi } from "vitest";

import { setAuthSessionReaderForTests } from "@/lib/auth/server";
import type { LearningRepository, ProgressRecord } from "@/lib/db/types";
import { AppError } from "@/lib/validation/app-error";

import {
  getMyProgress,
  getStudentDetail,
  saveReadingPosition,
} from "./service";

function repository(): LearningRepository {
  const progress: ProgressRecord[] = [];
  return {
    listProgress: vi.fn(async (userId) =>
      progress.filter((row) => row.userId === userId),
    ),
    saveProgress: vi.fn(async (row) => {
      const index = progress.findIndex(
        (existing) =>
          existing.userId === row.userId &&
          existing.lessonSlug === row.lessonSlug,
      );
      if (index >= 0) progress[index] = row;
      else progress.push(row);
      return row;
    }),
    listBookmarks: vi.fn(async () => []),
    createBookmark: vi.fn(async (row) => row),
    deleteBookmark: vi.fn(async () => false),
    getStudentProgress: vi.fn(async (userId) =>
      progress.filter((row) => row.userId === userId),
    ),
    getStudentBookmarks: vi.fn(async () => []),
  };
}

function session(userId: string, email = "student@example.com") {
  return async () => ({
    user: { id: userId, email, name: "Test student", emailVerified: true },
  });
}

afterEach(() => {
  setAuthSessionReaderForTests(undefined);
  vi.unstubAllEnvs();
});

describe("progress server service", () => {
  it("denies anonymous requests", async () => {
    setAuthSessionReaderForTests(async () => null);
    await expect(getMyProgress(repository())).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
    });
  });

  it("derives the owner from the session, never a client user ID", async () => {
    setAuthSessionReaderForTests(session("student-a"));
    const store = repository();

    await saveReadingPosition(
      {
        lessonSlug: "p3-fixture",
        lastHeading: "Cân bằng hóa học",
        readPercent: 45,
        userId: "student-b",
      },
      store,
    );

    expect(store.saveProgress).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "student-a",
        lessonSlug: "p3-fixture",
      }),
    );
  });

  it("rejects invalid heading and percentage", async () => {
    setAuthSessionReaderForTests(session("student-a"));
    const store = repository();

    await expect(
      saveReadingPosition(
        { lessonSlug: "p3-fixture", lastHeading: "", readPercent: 101 },
        store,
      ),
    ).rejects.toBeInstanceOf(AppError);
    await expect(
      saveReadingPosition(
        { lessonSlug: "p3-fixture", lastHeading: "Mục 1", readPercent: 1.5 },
        store,
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
  });

  it("allows teacher-only access to another student's data", async () => {
    const store = repository();
    vi.stubEnv("TEACHER_EMAILS", "teacher@example.com");
    setAuthSessionReaderForTests(session("teacher-1", "teacher@example.com"));

    await expect(getStudentDetail("student-a", store)).resolves.toEqual({
      progress: [],
    });

    setAuthSessionReaderForTests(session("student-b"));
    await expect(getStudentDetail("student-a", store)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});
