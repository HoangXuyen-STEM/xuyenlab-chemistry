import { notFound } from "next/navigation";

import { PrivateReader } from "@/components/private-reader/PrivateReader";
import { loadReaderProgress } from "@/features/content/reader-data";
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
  return <PrivateReader progress={await loadReaderProgress(lesson)} />;
}
