import { getMyProgress } from "@/features/progress/server";
import type { ProgressRecord } from "@/lib/db/types";

import type { ReaderProgress } from "./private-reader-facade";

export const emptyReaderProgress: ReaderProgress = {
  lastHeading: "",
  readPercent: 0,
  completed: false,
};

export function toReaderProgress(record: ProgressRecord): ReaderProgress {
  return {
    lastHeading: record.lastHeading ?? "",
    readPercent: record.readPercent,
    completed: record.status === "completed",
  };
}

/**
 * Initial progress for the reader shell.
 *
 * A backend failure degrades to the empty state instead of failing the page: the
 * lesson stays readable and the reader controls report the real error when the
 * student tries to save.
 */
export async function loadReaderProgress(
  lessonSlug: string,
): Promise<ReaderProgress> {
  try {
    const record = (await getMyProgress()).find(
      (row) => row.lessonSlug === lessonSlug,
    );
    return record ? toReaderProgress(record) : emptyReaderProgress;
  } catch {
    return emptyReaderProgress;
  }
}
