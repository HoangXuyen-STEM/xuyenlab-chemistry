"use client";

import { useActionState, useState } from "react";

import {
  signInWithPasswordAction,
  signUpWithPasswordAction,
} from "@/lib/auth/actions";
import { initialAuthFormState } from "@/lib/auth/form-state";

import styles from "./AuthForm.module.css";

export function LoginForm() {
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");

  const [signInState, signInFormAction, isSignInPending] = useActionState(
    signInWithPasswordAction,
    initialAuthFormState,
  );

  const [signUpState, signUpFormAction, isSignUpPending] = useActionState(
    signUpWithPasswordAction,
    initialAuthFormState,
  );

  const isSignUp = mode === "signUp";
  const state = isSignUp ? signUpState : signInState;
  const formAction = isSignUp ? signUpFormAction : signInFormAction;
  const isPending = isSignUp ? isSignUpPending : isSignInPending;

  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: "8px",
          marginBottom: "16px",
        }}
      >
        <button
          onClick={() => setMode("signIn")}
          style={{
            flex: 1,
            padding: "8px",
            borderRadius: "6px",
            border: "1px solid #ccc",
            background: mode === "signIn" ? "#0070f3" : "#f5f5f5",
            color: mode === "signIn" ? "#fff" : "#333",
            fontWeight: "bold",
            cursor: "pointer",
          }}
          type="button"
        >
          Đăng nhập
        </button>
        <button
          onClick={() => setMode("signUp")}
          style={{
            flex: 1,
            padding: "8px",
            borderRadius: "6px",
            border: "1px solid #ccc",
            background: mode === "signUp" ? "#0070f3" : "#f5f5f5",
            color: mode === "signUp" ? "#fff" : "#333",
            fontWeight: "bold",
            cursor: "pointer",
          }}
          type="button"
        >
          Tạo tài khoản mới
        </button>
      </div>

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
            autoComplete={isSignUp ? "new-password" : "current-password"}
            id="password"
            name="password"
            placeholder={isSignUp ? "Tối thiểu 8 ký tự" : undefined}
            required
            type="password"
          />
        </div>
        <button className={styles.submit} disabled={isPending} type="submit">
          {isPending
            ? isSignUp
              ? "Đang tạo tài khoản…"
              : "Đang đăng nhập…"
            : isSignUp
              ? "Tạo tài khoản & Đăng nhập"
              : "Đăng nhập"}
        </button>
      </form>
    </div>
  );
}
