import { randomUUID } from "node:crypto";

import { requireTeacher, requireUser } from "@/lib/auth";
import { getDatabase } from "@/lib/db/client";
import { createLearningRepository } from "@/lib/db/repositories";
import type { BookmarkRecord, LearningRepository } from "@/lib/db/types";
import { AppError } from "@/lib/validation/app-error";
import {
  createBookmarkSchema,
  lessonSlugSchema,
} from "@/lib/validation/learning";

function repositoryOrDefault(
  repository?: LearningRepository,
): LearningRepository {
  return repository ?? createLearningRepository(getDatabase());
}

function validationError(error: unknown): never {
  if (error instanceof Error && "issues" in error) {
    throw new AppError("VALIDATION_FAILED", "Invalid bookmark input.");
  }
  throw error;
}

export async function listMyBookmarks(
  lessonSlug?: unknown,
  repository?: LearningRepository,
): Promise<BookmarkRecord[]> {
  let parsedSlug: string | undefined;
  try {
    parsedSlug =
      lessonSlug === undefined ? undefined : lessonSlugSchema.parse(lessonSlug);
  } catch (error) {
    return validationError(error);
  }
  const user = await requireUser();
  return repositoryOrDefault(repository).listBookmarks(user.id, parsedSlug);
}

export async function createBookmark(
  input: unknown,
  repository?: LearningRepository,
): Promise<BookmarkRecord> {
  let parsed: ReturnType<typeof createBookmarkSchema.parse>;
  try {
    parsed = createBookmarkSchema.parse(input);
  } catch (error) {
    return validationError(error);
  }
  const user = await requireUser();
  return repositoryOrDefault(repository).createBookmark({
    id: randomUUID(),
    userId: user.id,
    lessonSlug: parsed.lessonSlug,
    anchor: parsed.anchor,
    label: parsed.label ?? null,
    createdAt: new Date(),
  });
}

export async function deleteBookmark(
  bookmarkId: unknown,
  repository?: LearningRepository,
): Promise<void> {
  if (typeof bookmarkId !== "string" || !bookmarkId.trim()) {
    throw new AppError("VALIDATION_FAILED", "Invalid bookmark ID.");
  }
  const user = await requireUser();
  const deleted = await repositoryOrDefault(repository).deleteBookmark(
    user.id,
    bookmarkId,
  );
  if (!deleted) throw new AppError("NOT_FOUND", "Bookmark not found.");
}

export async function getStudentBookmarks(
  studentUserId: string,
  repository?: LearningRepository,
): Promise<BookmarkRecord[]> {
  await requireTeacher();
  return repositoryOrDefault(repository).getStudentBookmarks(studentUserId);
}
