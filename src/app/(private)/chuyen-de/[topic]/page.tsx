import Link from "next/link";
import { notFound } from "next/navigation";

import styles from "@/components/private-reader/PrivateReader.module.css";
import {
  STAGING_TOPIC_SLUG,
  stagingLesson,
} from "@/features/content/staging-lesson";

export default async function TopicPage({
  params,
}: {
  params: Promise<{ topic: string }>;
}) {
  const { topic } = await params;
  if (topic !== STAGING_TOPIC_SLUG) notFound();
  return (
    <main className={styles.reader}>
      <p className={styles.stagingNotice}>
        STAGING ONLY · Synthetic topic, không xuất hiện trong discovery thật.
      </p>
      <nav className={styles.breadcrumbs} aria-label="Điều hướng">
        <Link href="/thu-vien">Thư viện</Link>
        <span>/</span>
        <span>P3 fixture</span>
      </nav>
      <h1>{stagingLesson.topic}</h1>
      <section className={styles.toc}>
        <h2>{stagingLesson.title}</h2>
        <p>{stagingLesson.summary}</p>
        <Link
          className={styles.primaryButton}
          href={`/chuyen-de/${topic}/p3-can-bang-hoa-hoc`}
        >
          Đọc bài fixture
        </Link>
      </section>
    </main>
  );
}
