import Link from "next/link";

import styles from "@/components/auth/AuthForm.module.css";
import { PasswordResetForm } from "@/components/auth/PasswordResetForm";

function firstValue(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const token = firstValue(params.token);

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <p className={styles.eyebrow}>XuyenLab Chemistry</p>
        <h1>Đặt lại mật khẩu</h1>
        {token ? (
          <>
            <p className={styles.intro}>
              Chọn mật khẩu mới cho tài khoản của bạn.
            </p>
            <PasswordResetForm token={token} />
          </>
        ) : (
          <p className={styles.alert} role="alert">
            Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn. Hãy yêu cầu
            liên kết mới.
          </p>
        )}
        <p className={styles.links}>
          <Link href="/quen-mat-khau">Yêu cầu liên kết mới</Link>
          <Link href="/dang-nhap">Quay lại đăng nhập</Link>
        </p>
      </section>
    </main>
  );
}
