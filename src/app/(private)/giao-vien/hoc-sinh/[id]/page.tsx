import { notFound, redirect } from "next/navigation";

import { TeacherStudentDetail } from "@/components/teacher/TeacherOverview";
import { stagingPrivateReaderFacade } from "@/features/content/private-reader-facade";

export default async function TeacherStudentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const viewer = await stagingPrivateReaderFacade.getViewer();
  if (viewer?.role !== "teacher") redirect("/khong-co-quyen");
  const { id } = await params;
  if (id !== "staging-student-a") notFound();
  return <TeacherStudentDetail id={id} />;
}
