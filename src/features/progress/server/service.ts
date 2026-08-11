import { requireTeacher, requireUser } from "@/lib/auth";
import { getDatabase } from "@/lib/db/client";
import { createLearningRepository } from "@/lib/db/repositories";
import type { LearningRepository, ProgressRecord } from "@/lib/db/types";
import { AppError } from "@/lib/validation/app-error";
import {
  lessonSlugSchema,
  saveReadingPositionSchema,
} from "@/lib/validation/learning";

function repositoryOrDefault(
  repository?: LearningRepository,
): LearningRepository {
  return repository ?? createLearningRepository(getDatabase());
}

function validationError(error: unknown): never {
  if (error instanceof Error && "issues" in error) {
    throw new AppError("VALIDATION_FAILED", "Invalid progress input.");
  }
  throw error;
}

export async function getMyProgress(
  repository?: LearningRepository,
): Promise<ProgressRecord[]> {
  const user = await requireUser();
  return repositoryOrDefault(repository).listProgress(user.id);
}

export async function saveReadingPosition(
  input: unknown,
  repository?: LearningRepository,
): Promise<ProgressRecord> {
  let parsed: ReturnType<typeof saveReadingPositionSchema.parse>;
  try {
    parsed = saveReadingPositionSchema.parse(input);
  } catch (error) {
    return validationError(error);
  }
  const user = await requireUser();
  const now = new Date();
  return repositoryOrDefault(repository).saveProgress({
    userId: user.id,
    lessonSlug: parsed.lessonSlug,
    status: "started",
    lastHeading: parsed.lastHeading,
    readPercent: parsed.readPercent,
    startedAt: now,
    updatedAt: now,
    completedAt: null,
  });
}

export async function markLessonComplete(
  lessonSlug: unknown,
  repository?: LearningRepository,
): Promise<ProgressRecord> {
  let parsedSlug: string;
  try {
    parsedSlug = lessonSlugSchema.parse(lessonSlug);
  } catch (error) {
    return validationError(error);
  }
  const user = await requireUser();
  const now = new Date();
  return repositoryOrDefault(repository).saveProgress({
    userId: user.id,
    lessonSlug: parsedSlug,
    status: "completed",
    lastHeading: null,
    readPercent: 100,
    startedAt: now,
    updatedAt: now,
    completedAt: now,
  });
}

export async function getStudentDetail(
  studentUserId: string,
  repository?: LearningRepository,
): Promise<{ progress: ProgressRecord[] }> {
  await requireTeacher();
  return {
    progress:
      await repositoryOrDefault(repository).getStudentProgress(studentUserId),
  };
}
