import Link from "next/link";

import styles from "@/components/private-reader/PrivateReader.module.css";

export default function LoginPage() {
  return (
    <main className={styles.reader}>
      <section className={styles.toc}>
        <p className={styles.eyebrow}>XuyenLab Chemistry</p>
        <h1>Đăng nhập</h1>
        <p>
          Đăng nhập Google và email/mật khẩu sẽ được Neon Auth adapter của P3.1
          kết nối tại server boundary.
        </p>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          placeholder="ban@example.com"
          type="email"
        />
        <button className={styles.primaryButton} type="button">
          Tiếp tục (staging)
        </button>
        <p>
          <Link href="/quen-mat-khau">Quên mật khẩu?</Link>
        </p>
      </section>
    </main>
  );
}
