import Link from "next/link";

import styles from "@/components/private-reader/PrivateReader.module.css";

export default function LibraryPage() {
  return (
    <main className={styles.reader}>
      <p className={styles.stagingNotice}>
        STAGING ONLY · P3 fixture bị loại khỏi thư viện bài học thật.
      </p>
      <h1>Thư viện</h1>
      <section className={styles.toc} aria-labelledby="fixture-title">
        <p className={styles.eyebrow}>Chuyên đề kiểm thử</p>
        <h2 id="fixture-title">P3 · Cân bằng hóa học</h2>
        <p>
          1 bài học synthetic · chỉ phục vụ kiểm tra private vertical slice.
        </p>
        <Link className={styles.primaryButton} href="/chuyen-de/p3-fixture">
          Mở fixture staging
        </Link>
      </section>
    </main>
  );
}
