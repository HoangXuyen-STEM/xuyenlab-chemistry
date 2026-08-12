"use client";

import { useActionState } from "react";

import { signInWithPasswordAction } from "@/lib/auth/actions";
import { initialAuthFormState } from "@/lib/auth/form-state";

import styles from "./AuthForm.module.css";

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(
    signInWithPasswordAction,
    initialAuthFormState,
  );

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
      <div className={styles.field}>
        <label htmlFor="password">Mật khẩu</label>
        <input
          autoComplete="current-password"
          id="password"
          name="password"
          required
          type="password"
        />
      </div>
      <button className={styles.submit} disabled={isPending} type="submit">
        {isPending ? "Đang đăng nhập…" : "Đăng nhập"}
      </button>
    </form>
  );
}
