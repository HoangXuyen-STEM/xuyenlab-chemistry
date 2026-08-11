import { redirect } from "next/navigation";

import { TeacherOverview } from "@/components/teacher/TeacherOverview";
import { stagingPrivateReaderFacade } from "@/features/content/private-reader-facade";

export default async function TeacherPage() {
  const viewer = await stagingPrivateReaderFacade.getViewer();
  if (viewer?.role !== "teacher") redirect("/khong-co-quyen");
  return <TeacherOverview />;
}
