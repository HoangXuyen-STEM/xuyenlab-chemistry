import Link from "next/link";

import styles from "@/components/private-reader/PrivateReader.module.css";

export default function NotFound() {
  return (
    <main className={styles.reader}>
      <section className={styles.toc}>
        <h1>Không tìm thấy trang</h1>
        <p>Kiểm tra lại đường dẫn hoặc trở về thư viện.</p>
        <Link className={styles.primaryButton} href="/thu-vien">
          Về thư viện
        </Link>
      </section>
    </main>
  );
}
