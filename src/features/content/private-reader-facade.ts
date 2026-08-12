/**
 * UI-facing types for the P3 private-reader slice.
 *
 * This intentionally has no provider imports. The server work happens in
 * `reader-session.ts` (viewer) and `reader-actions.ts` (progress and bookmarks),
 * so the reader components stay independent of Neon and R2.
 */
export type ViewerRole = "student" | "teacher";

export interface ReaderViewer {
  displayName: string;
  role: ViewerRole;
}

export interface ReaderProgress {
  lastHeading: string;
  readPercent: number;
  completed: boolean;
}
