import Link from "next/link";

import styles from "@/components/private-reader/PrivateReader.module.css";

export default function ProgressPage() {
  return (
    <main className={styles.reader}>
      <h1>Tiến độ của bạn</h1>
      <section className={styles.toc}>
        <h2>Chưa có tiến độ đã đồng bộ</h2>
        <p>
          Đây là trạng thái empty của P3. Khi P3.1 kết nối dữ liệu thật, tiến độ
          sẽ được khôi phục sau khi đăng nhập lại.
        </p>
        <Link className={styles.primaryButton} href="/thu-vien">
          Bắt đầu với thư viện
        </Link>
      </section>
    </main>
  );
}
