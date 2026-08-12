import Link from "next/link";

import { PdfButton } from "@/features/bookmarks/client/PdfButton";
import type { ReaderProgress } from "@/features/content/private-reader-facade";
import {
  STAGING_LESSON_SLUG,
  stagingLesson,
} from "@/features/content/staging-lesson";
import { ReaderControls } from "@/features/progress/client/ReaderControls";

import styles from "./PrivateReader.module.css";

export function PrivateReader({ progress }: { progress: ReaderProgress }) {
  return (
    <main className={styles.reader}>
      <p className={styles.stagingNotice}>
        STAGING ONLY · Synthetic fixture · Không phải bài học đã xuất bản
      </p>
      <nav aria-label="Điều hướng bài học" className={styles.breadcrumbs}>
        <Link href="/thu-vien">Thư viện</Link>
        <span aria-hidden="true">/</span>
        <Link href="/chuyen-de/p3-fixture">P3 fixture</Link>
        <span aria-hidden="true">/</span>
        <span>{stagingLesson.title}</span>
      </nav>
      <header className={styles.lessonHeader}>
        <div>
          <p className={styles.eyebrow}>{stagingLesson.topic}</p>
          <h1>{stagingLesson.title}</h1>
          <p>{stagingLesson.summary}</p>
        </div>
        <PdfButton lessonSlug={STAGING_LESSON_SLUG} />
      </header>
      <div className={styles.readerGrid}>
        <article className={styles.lessonContent}>
          <h2 id="can-bang-hoa-hoc">1. Cân bằng hóa học</h2>
          <p>
            Đây là đoạn văn bản synthetic chỉ dùng để kiểm tra khả năng đọc
            riêng tư, phục hồi tiến độ và bookmark.
          </p>
          <h2 id="vi-du">2. Ví dụ minh họa</h2>
          <p>
            Hệ số phản ứng phải được kiểm tra bởi người duyệt nội dung trước khi
            bất kỳ bài học thật nào được xuất bản.
          </p>
          <h2 id="tu-kiem-tra">3. Tự kiểm tra</h2>
          <p>
            Không có quiz hay chấm điểm trong P3. Người học có thể đánh dấu bài
            đã hoàn thành khi chủ động chọn.
          </p>
          <nav aria-label="Bài trước và bài sau" className={styles.lessonNav}>
            <span>Bài trước: không có</span>
            <span>Bài sau: không có</span>
          </nav>
        </article>
        <aside className={styles.toc}>
          <nav aria-label="Mục lục bài học">
            <h2>Mục lục</h2>
            <ol>
              {stagingLesson.headings.map((heading) => (
                <li key={heading.id}>
                  <a href={`#${heading.id}`}>{heading.label}</a>
                </li>
              ))}
            </ol>
          </nav>
          <ReaderControls
            initialProgress={progress}
            lessonSlug={STAGING_LESSON_SLUG}
          />
        </aside>
      </div>
    </main>
  );
}
