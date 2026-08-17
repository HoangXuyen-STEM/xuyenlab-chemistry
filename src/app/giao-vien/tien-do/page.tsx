import type { Metadata } from "next";

import { TeacherProgressDashboard } from "@/features/progress/TeacherProgressDashboard";
import { requireTeacher } from "@/lib/auth/server";
import { getDatabase } from "@/lib/db/client";
import { createProgressRepository } from "@/lib/db/repositories";
import type { ProgressRecord } from "@/lib/db/types";

// Auth + DB on every request — must not be statically generated at build time.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tiến độ học sinh | XuyenLab Hóa học",
  description: "Bảng theo dõi tiến độ đọc bài của học sinh trong lớp.",
};

export default async function TeacherProgressPage() {
  await requireTeacher();

  let rows: ProgressRecord[] = [];
  try {
    if (process.env.DATABASE_URL?.trim()) {
      const db = getDatabase();
      const progress = createProgressRepository(db);
      rows = await progress.listAll();
    }
  } catch {
    // Preview/CI without a reachable DB should still render an empty dashboard.
    rows = [];
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <TeacherProgressDashboard rows={rows} />
    </main>
  );
}
