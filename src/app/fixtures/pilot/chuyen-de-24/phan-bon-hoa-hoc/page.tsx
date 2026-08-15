import { PilotLessonShell } from "@/components/pilot-reader/PilotLessonShell";
import { getPilotLessonManifest } from "@/features/content/pilot-manifest";
import { loadRemediationQueueSummary } from "@/features/content/remediation-queue";

// `body.mdx` is a byte-identical copy of
// `content/topics/chuyen-de-24/phan-bon-hoa-hoc.mdx` with its YAML frontmatter
// removed (`tail -n +17`); the frontmatter block itself does not parse
// cleanly through this project's MDX pipeline (no `remark-frontmatter`). No
// chemistry content, table, figure or warning ID differs from the canonical
// file. Regenerate after any importer rerun; see
// docs/handoffs/P6/P6-B1.1-copilot.md.
import LessonBody from "./body.mdx";

const TOPIC_TITLE = "Chuyên đề 24 · Phân bón hóa học";
// Lifecycle-neutral title/summary (P6-B1.3U correction): must stay correct
// whether this lesson's manifest status is draft or in_review — the
// PilotLessonShell banner (derived from manifest.status) is what actually
// states the lifecycle stage, not this text. This also keeps this page
// accurate once P6-B1.4 promotes Topic 24 from draft to in_review, without
// needing another text edit here.
const LESSON_TITLE = "Phân bón hóa học — Pilot Phần I";
const SUMMARY =
  "Bản pilot Phần I; mọi công thức, bảng và hình giữ nguyên ID ổn định để đối chiếu.";
const ARTICLE_ID = "phan-bon-hoa-hoc-body";

export default function PilotPhanBonHoaHocPage() {
  const manifest = getPilotLessonManifest("chuyen-de-24", "phan-bon-hoa-hoc");
  const { acceptedLimitations, discussionPrompts } =
    loadRemediationQueueSummary(manifest);

  return (
    <PilotLessonShell
      acceptedLimitations={acceptedLimitations}
      articleId={ARTICLE_ID}
      discussionPrompts={discussionPrompts}
      lessonTitle={LESSON_TITLE}
      manifest={manifest}
      summary={SUMMARY}
      topicTitle={TOPIC_TITLE}
    >
      <LessonBody />
    </PilotLessonShell>
  );
}
