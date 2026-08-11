import { notFound } from "next/navigation";

import { PrivateReader } from "@/components/private-reader/PrivateReader";
import { stagingPrivateReaderFacade } from "@/features/content/private-reader-facade";
import {
  STAGING_LESSON_SLUG,
  STAGING_TOPIC_SLUG,
} from "@/features/content/staging-lesson";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ topic: string; lesson: string }>;
}) {
  const { topic, lesson } = await params;
  if (topic !== STAGING_TOPIC_SLUG || lesson !== STAGING_LESSON_SLUG)
    notFound();
  const progress = await stagingPrivateReaderFacade.getProgress(lesson);
  if (!progress) notFound();
  return (
    <PrivateReader facade={stagingPrivateReaderFacade} progress={progress} />
  );
}
