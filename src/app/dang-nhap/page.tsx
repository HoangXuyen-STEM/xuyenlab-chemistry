import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Đăng nhập | XuyenLab Hóa học",
  description: "Đăng nhập hoặc tạo tài khoản học sinh/giáo viên.",
};

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-lg space-y-4">
        <p className="text-center text-sm text-slate-600">
          <Link
            href="/"
            className="font-medium text-sky-700 hover:text-sky-800"
          >
            ← Về trang chủ
          </Link>
        </p>
        <Suspense
          fallback={
            <p className="text-center text-sm text-slate-600">Đang tải…</p>
          }
        >
          <LoginForm />
        </Suspense>
        <p className="text-center text-sm text-slate-600">
          <Link
            href="/quen-mat-khau"
            className="font-medium text-sky-700 hover:text-sky-800"
          >
            Quên mật khẩu?
          </Link>
        </p>
      </div>
    </main>
  );
}
