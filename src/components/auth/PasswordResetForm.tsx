"use client";

import { useActionState } from "react";

import { resetPasswordAction } from "@/lib/auth/actions";
import { initialAuthFormState } from "@/lib/auth/form-state";

import styles from "./AuthForm.module.css";

export function PasswordResetForm({ token }: { token: string }) {
  const [state, formAction, isPending] = useActionState(
    resetPasswordAction,
    initialAuthFormState,
  );

  return (
    <form action={formAction} className={styles.form}>
      {state.error ? (
        <p className={styles.alert} role="alert">
          {state.error}
        </p>
      ) : null}
      <input name="token" type="hidden" value={token} />
      <div className={styles.field}>
        <label htmlFor="password">Mật khẩu mới</label>
        <input
          autoComplete="new-password"
          id="password"
          minLength={8}
          name="password"
          required
          type="password"
        />
        <p className={styles.hint}>Tối thiểu 8 ký tự.</p>
      </div>
      <div className={styles.field}>
        <label htmlFor="confirmPassword">Nhập lại mật khẩu mới</label>
        <input
          autoComplete="new-password"
          id="confirmPassword"
          minLength={8}
          name="confirmPassword"
          required
          type="password"
        />
      </div>
      <button className={styles.submit} disabled={isPending} type="submit">
        {isPending ? "Đang cập nhật…" : "Đặt lại mật khẩu"}
      </button>
    </form>
  );
}
