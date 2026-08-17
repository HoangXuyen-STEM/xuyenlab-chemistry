import type { Metadata } from "next";

import { requireTeacher } from "@/lib/auth/server";

// Auth on every request — must not be statically generated at build time.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tiến độ học sinh | XuyenLab Hóa học",
  description: "Bảng theo dõi tiến độ đọc bài của học sinh trong lớp.",
};

// NOTE: This route is not part of the current UX spec (docs/ux-spec.md lists
// `/giao-vien` for the class overview and `/tien-do` for a student's own
// dashboard, but no combined `/giao-vien/tien-do`). It previously imported a
// `TeacherProgressDashboard` component and a `createProgressRepository`
// function that do not exist anywhere in the codebase, which broke the
// production build. Until the teacher progress dashboard is designed and
// implemented, this renders a safe placeholder behind the same teacher auth
// gate instead of removing the route outright.
export default async function TeacherProgressPage() {
  await requireTeacher();

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-xl font-semibold">Tiến độ học sinh</h1>
      <p className="mt-2 text-sm text-gray-600">
        Tính năng đang được phát triển. Vui lòng quay lại sau.
      </p>
    </main>
  );
}
