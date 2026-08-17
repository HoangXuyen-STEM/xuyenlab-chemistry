"use client";

import { useSearchParams } from "next/navigation";
import { useActionState } from "react";

import {
  signInWithGoogleAction,
  signInWithPasswordAction,
  signUpWithPasswordAction,
} from "@/lib/auth/actions";
import {
  initialAuthFormState,
  type AuthFormState,
} from "@/lib/auth/form-state";

const inputClassName =
  "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200";

const buttonClassName =
  "inline-flex w-full items-center justify-center rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 disabled:cursor-not-allowed disabled:opacity-60";

function AuthMessage({ state }: { state: AuthFormState }) {
  if (state.error) {
    return (
      <p
        role="alert"
        className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
      >
        {state.error}
      </p>
    );
  }
  if (state.success) {
    return (
      <p
        role="status"
        className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
      >
        {state.success}
      </p>
    );
  }
  return null;
}

export function LoginForm() {
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");

  const [signInState, signInAction, signInPending] = useActionState(
    signInWithPasswordAction,
    initialAuthFormState,
  );
  const [signUpState, signUpAction, signUpPending] = useActionState(
    signUpWithPasswordAction,
    initialAuthFormState,
  );

  return (
    <div className="mx-auto w-full max-w-md space-y-6">
      {urlError ? (
        <p
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
        >
          {urlError}
        </p>
      ) : null}
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <header className="space-y-1">
          <h1 className="text-xl font-semibold text-slate-900">Đăng nhập</h1>
          <p className="text-sm text-slate-600">
            Dùng email lớp học và mật khẩu, hoặc tiếp tục với Google.
          </p>
        </header>

        <AuthMessage state={signInState} />

        <form action={signInAction} className="space-y-3">
          <label className="block text-sm font-medium text-slate-700">
            Email
            <input
              className={inputClassName}
              type="email"
              name="email"
              autoComplete="email"
              required
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Mật khẩu
            <input
              className={inputClassName}
              type="password"
              name="password"
              autoComplete="current-password"
              required
              minLength={8}
            />
          </label>
          <button
            type="submit"
            className={buttonClassName}
            disabled={signInPending}
          >
            {signInPending ? "Đang đăng nhập…" : "Đăng nhập"}
          </button>
        </form>

        <div className="relative py-2 text-center text-xs font-medium uppercase tracking-wide text-slate-400">
          <span className="bg-white px-2">hoặc</span>
        </div>

        <form action={signInWithGoogleAction}>
          <button
            type="submit"
            className="inline-flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
          >
            Tiếp tục với Google
          </button>
        </form>
      </section>

      <section className="space-y-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6">
        <header className="space-y-1">
          <h2 className="text-base font-semibold text-slate-900">
            Tạo tài khoản mới
          </h2>
          <p className="text-sm text-slate-600">
            Chỉ email đã được giáo viên ghi danh mới đăng ký được.
          </p>
        </header>

        <AuthMessage state={signUpState} />

        <form action={signUpAction} className="space-y-3">
          <label className="block text-sm font-medium text-slate-700">
            Email
            <input
              className={inputClassName}
              type="email"
              name="email"
              autoComplete="email"
              required
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Mật khẩu (tối thiểu 8 ký tự)
            <input
              className={inputClassName}
              type="password"
              name="password"
              autoComplete="new-password"
              required
              minLength={8}
            />
          </label>
          <button
            type="submit"
            className={buttonClassName}
            disabled={signUpPending}
          >
            {signUpPending ? "Đang tạo tài khoản…" : "Tạo tài khoản"}
          </button>
        </form>
      </section>
    </div>
  );
}
