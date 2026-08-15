import { PilotLessonShell } from "@/components/pilot-reader/PilotLessonShell";
import { getPilotLessonManifest } from "@/features/content/pilot-manifest";
import { loadRemediationQueueSummary } from "@/features/content/remediation-queue";

// `body.mdx` is a byte-identical copy of
// `content/topics/chuyen-de-02/bang-tuan-hoan.mdx` with its YAML frontmatter
// removed (`tail -n +17`); the frontmatter block itself does not parse
// cleanly through this project's MDX pipeline (no `remark-frontmatter`). No
// chemistry content, table, figure or warning ID differs from the canonical
// file. Regenerate after any importer rerun; see
// docs/handoffs/P6/P6-B2.0-import-claude.md.
import LessonBody from "./body.mdx";

const TOPIC_TITLE = "Chuyên đề 02 · Bảng tuần hoàn";
// Lifecycle-neutral title/summary (same convention as Topic 24, P6-B1.3U):
// must stay correct whether this lesson's manifest status is draft or
// in_review — the PilotLessonShell banner (derived from manifest.status) is
// what actually states the lifecycle stage, not this text.
const LESSON_TITLE = "Bảng tuần hoàn — Pilot Phần I";
const SUMMARY =
  "Bản pilot Phần I; mọi công thức, bảng và hình giữ nguyên ID ổn định để đối chiếu.";
const ARTICLE_ID = "bang-tuan-hoan-body";

export default function PilotBangTuanHoanPage() {
  const manifest = getPilotLessonManifest("chuyen-de-02", "bang-tuan-hoan");
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
