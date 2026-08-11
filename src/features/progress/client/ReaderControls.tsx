"use client";

import { useState } from "react";

import type {
  PrivateReaderFacade,
  ReaderProgress,
} from "@/features/content/private-reader-facade";

import styles from "@/components/private-reader/PrivateReader.module.css";

interface ReaderControlsProps {
  facade: PrivateReaderFacade;
  lessonSlug: string;
  initialProgress: ReaderProgress;
}

export function ReaderControls({
  facade,
  lessonSlug,
  initialProgress,
}: ReaderControlsProps) {
  const [progress, setProgress] = useState(initialProgress);
  const [bookmarkSaved, setBookmarkSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function savePosition() {
    setIsSaving(true);
    setMessage(null);
    try {
      const saved = await facade.saveReadingPosition({
        lessonSlug,
        lastHeading: "vi-du",
        readPercent: 67,
      });
      setProgress(saved);
      setMessage("Đã lưu vị trí đọc.");
    } catch {
      setMessage("Không thể lưu tiến độ. Bạn vẫn có thể tiếp tục đọc.");
    } finally {
      setIsSaving(false);
    }
  }

  async function complete() {
    setIsSaving(true);
    setMessage(null);
    try {
      const saved = await facade.markLessonComplete(lessonSlug);
      setProgress(saved);
      setMessage("Đã đánh dấu hoàn thành.");
    } catch {
      setMessage("Không thể cập nhật trạng thái hoàn thành. Vui lòng thử lại.");
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleBookmark() {
    setIsSaving(true);
    setMessage(null);
    try {
      const saved = await facade.toggleBookmark({
        lessonSlug,
        anchor: "vi-du",
      });
      setBookmarkSaved(saved);
      setMessage(
        saved ? "Đã lưu bookmark tại Ví dụ minh họa." : "Đã bỏ bookmark.",
      );
    } catch {
      setMessage("Không thể lưu bookmark. Vui lòng thử lại.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className={styles.controls} aria-label="Điều khiển bài học">
      <p className={styles.progressLabel} aria-live="polite">
        {progress.completed ? "Hoàn thành" : `${progress.readPercent}% đã đọc`}
      </p>
      <div className={styles.progressTrack} aria-hidden="true">
        <span style={{ width: `${progress.readPercent}%` }} />
      </div>
      <div className={styles.controlButtons}>
        <button
          className={styles.secondaryButton}
          disabled={isSaving}
          onClick={savePosition}
          type="button"
        >
          {isSaving ? "Đang lưu…" : "Lưu vị trí"}
        </button>
        <button
          aria-pressed={bookmarkSaved}
          className={styles.secondaryButton}
          disabled={isSaving}
          onClick={toggleBookmark}
          type="button"
        >
          {bookmarkSaved ? "Đã bookmark" : "Bookmark"}
        </button>
        <button
          className={styles.primaryButton}
          disabled={isSaving || progress.completed}
          onClick={complete}
          type="button"
        >
          {progress.completed ? "Đã hoàn thành" : "Đã học xong"}
        </button>
      </div>
      {message ? (
        <p className={styles.statusMessage} role="status">
          {message}
        </p>
      ) : null}
    </section>
  );
}
