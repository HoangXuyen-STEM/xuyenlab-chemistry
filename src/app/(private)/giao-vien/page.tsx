import { redirect } from "next/navigation";

import { TeacherOverview } from "@/components/teacher/TeacherOverview";
import { getReaderViewer } from "@/features/content/reader-session";

export default async function TeacherPage() {
  const viewer = await getReaderViewer();
  if (viewer?.role !== "teacher") redirect("/khong-co-quyen");
  return <TeacherOverview />;
}
