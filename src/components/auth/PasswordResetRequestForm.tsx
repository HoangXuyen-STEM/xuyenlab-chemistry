"use client";

import { useActionState } from "react";

import { requestPasswordResetAction } from "@/lib/auth/actions";
import { initialPasswordResetFormState } from "@/lib/auth/form-state";

import styles from "./AuthForm.module.css";

export function PasswordResetRequestForm() {
  const [state, formAction, isPending] = useActionState(
    requestPasswordResetAction,
    initialPasswordResetFormState,
  );

  if (state.submitted) {
    return (
      <p className={styles.hint} role="status">
        Nếu email này có tài khoản, chúng tôi đã gửi liên kết đặt lại mật khẩu.
        Hãy kiểm tra hộp thư và cả mục spam.
      </p>
    );
  }

  return (
    <form action={formAction} className={styles.form}>
      {state.error ? (
        <p className={styles.alert} role="alert">
          {state.error}
        </p>
      ) : null}
      <div className={styles.field}>
        <label htmlFor="email">Email</label>
        <input
          autoComplete="email"
          id="email"
          name="email"
          placeholder="ban@example.com"
          required
          type="email"
        />
      </div>
      <button className={styles.submit} disabled={isPending} type="submit">
        {isPending ? "Đang gửi…" : "Gửi liên kết đặt lại"}
      </button>
    </form>
  );
}
