/**
 * UI-facing boundary for the P3 private-reader slice.
 *
 * This intentionally has no provider imports. P3.1/P3.3 can supply a server
 * implementation later without making the reader depend on Neon or R2.
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

export interface PrivateReaderFacade {
  getViewer(): Promise<ReaderViewer | null>;
  getProgress(lessonSlug: string): Promise<ReaderProgress | null>;
  saveReadingPosition(input: {
    lessonSlug: string;
    lastHeading: string;
    readPercent: number;
  }): Promise<ReaderProgress>;
  toggleBookmark(input: {
    lessonSlug: string;
    anchor: string;
  }): Promise<boolean>;
  markLessonComplete(lessonSlug: string): Promise<ReaderProgress>;
  requestPdf(lessonSlug: string): Promise<{ url: string; expiresAt: string }>;
}

const stagingProgress: ReaderProgress = {
  lastHeading: "can-bang-hoa-hoc",
  readPercent: 50,
  completed: false,
};

/** Staging-only mock; it must never be used as an authorization boundary. */
export const stagingPrivateReaderFacade: PrivateReaderFacade = {
  async getViewer() {
    return { displayName: "Học sinh thử nghiệm", role: "student" };
  },
  async getProgress() {
    return stagingProgress;
  },
  async saveReadingPosition(input) {
    return { ...stagingProgress, ...input };
  },
  async toggleBookmark() {
    return true;
  },
  async markLessonComplete() {
    return { ...stagingProgress, completed: true, readPercent: 100 };
  },
  async requestPdf() {
    return {
      url: "https://example.invalid/staging-signed-pdf",
      expiresAt: "UNVERIFIED — P3.3 signer pending",
    };
  },
};
