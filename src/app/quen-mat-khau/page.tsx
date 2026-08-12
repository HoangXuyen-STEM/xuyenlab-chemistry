import Link from "next/link";

import styles from "@/components/auth/AuthForm.module.css";
import { PasswordResetRequestForm } from "@/components/auth/PasswordResetRequestForm";

export default function ForgotPasswordPage() {
  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <p className={styles.eyebrow}>XuyenLab Chemistry</p>
        <h1>Quên mật khẩu</h1>
        <p className={styles.intro}>
          Nhập email của bạn. Nếu tài khoản tồn tại, bạn sẽ nhận được liên kết
          đặt lại mật khẩu có thời hạn.
        </p>
        <PasswordResetRequestForm />
        <p className={styles.links}>
          <Link href="/dang-nhap">Quay lại đăng nhập</Link>
        </p>
      </section>
    </main>
  );
}
