import { and, desc, eq } from "drizzle-orm";

import { bookmarks, lessonProgress } from "../../../db/schema";

import type { Database } from "./client";
import type { LearningRepository } from "./types";

export function createLearningRepository(
  database: Database,
): LearningRepository {
  return {
    async listProgress(userId) {
      return database
        .select()
        .from(lessonProgress)
        .where(eq(lessonProgress.userId, userId))
        .orderBy(desc(lessonProgress.updatedAt));
    },
    async saveProgress(record) {
      const [saved] = await database
        .insert(lessonProgress)
        .values(record)
        .onConflictDoUpdate({
          target: [lessonProgress.userId, lessonProgress.lessonSlug],
          set: {
            status: record.status,
            lastHeading: record.lastHeading,
            readPercent: record.readPercent,
            updatedAt: record.updatedAt,
            completedAt: record.completedAt,
          },
        })
        .returning();
      return saved;
    },
    async listBookmarks(userId, lessonSlug) {
      const where = lessonSlug
        ? and(
            eq(bookmarks.userId, userId),
            eq(bookmarks.lessonSlug, lessonSlug),
          )
        : eq(bookmarks.userId, userId);
      return database
        .select()
        .from(bookmarks)
        .where(where)
        .orderBy(desc(bookmarks.createdAt));
    },
    async createBookmark(record) {
      const [created] = await database
        .insert(bookmarks)
        .values(record)
        .returning();
      return created;
    },
    async deleteBookmark(userId, bookmarkId) {
      const deleted = await database
        .delete(bookmarks)
        .where(and(eq(bookmarks.id, bookmarkId), eq(bookmarks.userId, userId)))
        .returning({ id: bookmarks.id });
      return deleted.length === 1;
    },
    async getStudentProgress(userId) {
      return database
        .select()
        .from(lessonProgress)
        .where(eq(lessonProgress.userId, userId))
        .orderBy(desc(lessonProgress.updatedAt));
    },
    async getStudentBookmarks(userId) {
      return database
        .select()
        .from(bookmarks)
        .where(eq(bookmarks.userId, userId))
        .orderBy(desc(bookmarks.createdAt));
    },
  };
}
