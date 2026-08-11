import { afterEach, describe, expect, it, vi } from "vitest";

import { setAuthSessionReaderForTests } from "@/lib/auth/server";
import type { LearningRepository } from "@/lib/db/types";

import { createBookmark, deleteBookmark, listMyBookmarks } from "./service";

function repository(): LearningRepository {
  const bookmarks: Array<{
    id: string;
    userId: string;
    lessonSlug: string;
    anchor: string;
    label: string | null;
    createdAt: Date;
  }> = [];
  return {
    listProgress: vi.fn(async () => []),
    saveProgress: vi.fn(async (row) => row),
    listBookmarks: vi.fn(async (userId) =>
      bookmarks.filter((row) => row.userId === userId),
    ),
    createBookmark: vi.fn(async (row) => {
      bookmarks.push(row);
      return row;
    }),
    deleteBookmark: vi.fn(async (userId, bookmarkId) => {
      const index = bookmarks.findIndex(
        (row) => row.id === bookmarkId && row.userId === userId,
      );
      if (index < 0) return false;
      bookmarks.splice(index, 1);
      return true;
    }),
    getStudentProgress: vi.fn(async () => []),
    getStudentBookmarks: vi.fn(async () => []),
  };
}

afterEach(() => setAuthSessionReaderForTests(undefined));

describe("bookmark server service", () => {
  it("stores and lists only the authenticated student's records", async () => {
    const store = repository();
    setAuthSessionReaderForTests(async () => ({
      user: { id: "student-a", email: "a@example.com", emailVerified: true },
    }));
    await createBookmark(
      { lessonSlug: "p3-fixture", anchor: "#can-bang", label: "Cân bằng" },
      store,
    );
    setAuthSessionReaderForTests(async () => ({
      user: { id: "student-b", email: "b@example.com", emailVerified: true },
    }));

    await expect(listMyBookmarks(undefined, store)).resolves.toEqual([]);
  });

  it("cannot delete another student's bookmark", async () => {
    const store = repository();
    setAuthSessionReaderForTests(async () => ({
      user: { id: "student-a", email: "a@example.com", emailVerified: true },
    }));
    const bookmark = await createBookmark(
      { lessonSlug: "p3-fixture", anchor: "#a" },
      store,
    );
    setAuthSessionReaderForTests(async () => ({
      user: { id: "student-b", email: "b@example.com", emailVerified: true },
    }));

    await expect(deleteBookmark(bookmark.id, store)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});
