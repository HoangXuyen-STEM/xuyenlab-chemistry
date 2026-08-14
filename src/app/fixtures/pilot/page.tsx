import Link from "next/link";

import { topics } from "../../../../content/topics";
import { listPilotLessonManifests } from "@/features/content/pilot-manifest";

import styles from "./page.module.css";

function topicTitle(topicSlug: string): string {
  return topics.find((topic) => topic.slug === topicSlug)?.title ?? topicSlug;
}

export default function PilotIndexPage() {
  const lessons = listPilotLessonManifests();

  return (
    <main className={styles.page}>
      <div className={styles.banner} aria-hidden="true">
        [BẢN NHÁP PILOT] — Xem trước staging — không cần đăng nhập
      </div>
      <div className={styles.content}>
        <h1>Pilot nội dung Phần I</h1>
        <p className={styles.intro}>
          Các bài học nháp Phần I từ pipeline import, dùng để Chủ dự án đối
          chiếu trước khi chuyển sang <code>in_review</code>. Mọi mục cảnh
          báo/chặn xuất bản vẫn hiển thị nguyên trạng.
        </p>
        <ul className={styles.list}>
          {lessons.map((lesson) => (
            <li className={styles.card} key={lesson.slug}>
              <p className={styles.eyebrow}>
                {topicTitle(lesson.topic)} ·{" "}
                <span className={styles.status} data-testid="lesson-status">
                  {lesson.status}
                </span>
              </p>
              <h2>
                <Link href={`/fixtures/pilot/${lesson.topic}/${lesson.slug}`}>
                  {lesson.slug}
                </Link>
              </h2>
              <p className={styles.meta}>
                Nguồn <code>{lesson.sourceId}</code> ·{" "}
                <span className={styles.blockingCount}>
                  {lesson.blockingCount} mục chặn
                </span>{" "}
                ·{" "}
                <span className={styles.warningCount}>
                  {lesson.warningCount} cảnh báo
                </span>
              </p>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
