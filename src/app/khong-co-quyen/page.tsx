import Link from "next/link";

import styles from "@/components/private-reader/PrivateReader.module.css";

export default function AccessDeniedPage() {
  return (
    <main className={styles.reader}>
      <section className={styles.toc}>
        <h1>Bạn không có quyền truy cập trang này</h1>
        <p>
          Trang giáo viên và dữ liệu học sinh khác luôn được kiểm tra ở server.
          UI này không phải cơ chế bảo mật.
        </p>
        <Link className={styles.primaryButton} href="/thu-vien">
          Về thư viện
        </Link>
      </section>
    </main>
  );
}
