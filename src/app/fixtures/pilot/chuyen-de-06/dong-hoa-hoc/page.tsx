import { PilotLessonShell } from "@/components/pilot-reader/PilotLessonShell";
import { getPilotLessonManifest } from "@/features/content/pilot-manifest";
import { loadRemediationQueueSummary } from "@/features/content/remediation-queue";

// `body.mdx` is a byte-identical copy of `content/topics/chuyen-de-06/dong-hoa-hoc.mdx`
// with its YAML frontmatter removed (`tail -n +17`); the frontmatter block
// itself does not parse cleanly through this project's MDX pipeline (no
// `remark-frontmatter`). No chemistry content, table, figure or blocking/
// warning ID differs from the canonical file. Regenerate after any P4.1
// importer rerun; see docs/handoffs/P4/P4.2-claude.md.
import LessonBody from "./body.mdx";

const TOPIC_TITLE = "Chuyên đề 6 · Động hóa học";
// Lifecycle-neutral title/summary (P6-B1.3U correction): must stay correct
// whether this lesson's manifest status is draft or in_review — the
// PilotLessonShell banner (derived from manifest.status) is what actually
// states the lifecycle stage, not this text.
const LESSON_TITLE = "Động hóa học — Pilot Phần I";
const SUMMARY =
  "Bản pilot Phần I; mọi công thức, bảng và hình giữ nguyên ID ổn định để đối chiếu.";
const ARTICLE_ID = "dong-hoa-hoc-body";

export default function PilotDongHoaHocPage() {
  const manifest = getPilotLessonManifest("chuyen-de-06", "dong-hoa-hoc");
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
