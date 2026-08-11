export type ProgressStatus = "started" | "completed";

export interface ProgressRecord {
  userId: string;
  lessonSlug: string;
  status: ProgressStatus;
  lastHeading: string | null;
  readPercent: number;
  startedAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
}

export interface BookmarkRecord {
  id: string;
  userId: string;
  lessonSlug: string;
  anchor: string;
  label: string | null;
  createdAt: Date;
}

export interface LearningRepository {
  listProgress(userId: string): Promise<ProgressRecord[]>;
  saveProgress(record: ProgressRecord): Promise<ProgressRecord>;
  listBookmarks(userId: string, lessonSlug?: string): Promise<BookmarkRecord[]>;
  createBookmark(record: BookmarkRecord): Promise<BookmarkRecord>;
  deleteBookmark(userId: string, bookmarkId: string): Promise<boolean>;
  getStudentProgress(userId: string): Promise<ProgressRecord[]>;
  getStudentBookmarks(userId: string): Promise<BookmarkRecord[]>;
}
