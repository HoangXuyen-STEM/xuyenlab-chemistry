"use server";

import {
  createBookmark,
  deleteBookmark,
  listMyBookmarks,
} from "@/features/bookmarks/server";
import {
  markLessonComplete,
  saveReadingPosition,
} from "@/features/progress/server";

import type { ReaderProgress } from "./private-reader-facade";
import { toReaderProgress } from "./reader-data";

/**
 * Server actions behind the reader controls.
 *
 * Client components call these instead of receiving a facade object as a prop:
 * functions cannot cross the server/client boundary unless they are server
 * actions. Every action authorizes through the P3.1 services, which derive the
 * user from the session and never accept a client-supplied `user_id`.
 */
export async function saveReadingPositionAction(input: {
  lessonSlug: string;
  lastHeading: string;
  readPercent: number;
}): Promise<ReaderProgress> {
  return toReaderProgress(await saveReadingPosition(input));
}

export async function markLessonCompleteAction(
  lessonSlug: string,
): Promise<ReaderProgress> {
  return toReaderProgress(await markLessonComplete(lessonSlug));
}

/** Returns the state after the toggle: `true` when the anchor is bookmarked. */
export async function toggleBookmarkAction(input: {
  lessonSlug: string;
  anchor: string;
}): Promise<boolean> {
  const existing = (await listMyBookmarks(input.lessonSlug)).find(
    (bookmark) => bookmark.anchor === input.anchor,
  );
  if (existing) {
    await deleteBookmark(existing.id);
    return false;
  }
  await createBookmark(input);
  return true;
}
