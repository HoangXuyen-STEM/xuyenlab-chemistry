import Link from "next/link";

import styles from "@/components/auth/AuthForm.module.css";
import { LoginForm } from "@/components/auth/LoginForm";
import { signInWithGoogleAction } from "@/lib/auth/actions";

const NOTICES: Record<string, string> = {
  "da-doi-mat-khau": "Đã đổi mật khẩu. Hãy đăng nhập bằng mật khẩu mới.",
};

const ERRORS: Record<string, string> = {
  google: "Không bắt đầu được đăng nhập Google. Vui lòng thử lại.",
};

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const notice = NOTICES[firstValue(params["trang-thai"]) ?? ""];
  const error = ERRORS[firstValue(params.loi) ?? ""];

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <p className={styles.eyebrow}>XuyenLab Chemistry</p>
        <h1>Đăng nhập</h1>
        <p className={styles.intro}>
          Tài khoản do giáo viên cấp. Dùng email/mật khẩu hoặc tài khoản Google
          đã được ghi danh.
        </p>
        {notice ? <p className={styles.notice}>{notice}</p> : null}
        {error ? (
          <p className={styles.alert} role="alert">
            {error}
          </p>
        ) : null}
        <LoginForm />
        <p className={styles.divider}>hoặc</p>
        <form action={signInWithGoogleAction}>
          <button className={styles.provider} type="submit">
            Tiếp tục với Google
          </button>
        </form>
        <p className={styles.links}>
          <Link href="/quen-mat-khau">Quên mật khẩu?</Link>
        </p>
      </section>
    </main>
  );
}
