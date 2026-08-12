import { PilotLessonShell } from "@/components/pilot-reader/PilotLessonShell";
import { getPilotLessonManifest } from "@/features/content/pilot-manifest";

// `body.mdx` is a byte-identical copy of `content/topics/chuyen-de-06/dong-hoa-hoc.mdx`
// with its YAML frontmatter removed (`tail -n +17`); the frontmatter block
// itself does not parse cleanly through this project's MDX pipeline (no
// `remark-frontmatter`). No chemistry content, table, figure or blocking/
// warning ID differs from the canonical file. Regenerate after any P4.1
// importer rerun; see docs/handoffs/P4/P4.2-claude.md.
import LessonBody from "./body.mdx";

const TOPIC_TITLE = "Chuyên đề 6 · Động hóa học";
const LESSON_TITLE = "Động hóa học — bản nháp pilot Phần I";
const SUMMARY =
  "Bản nháp pilot Phần I; mọi công thức, bảng và hình vẫn chờ Chủ dự án QA.";
const ARTICLE_ID = "dong-hoa-hoc-body";

export default function PilotDongHoaHocPage() {
  const manifest = getPilotLessonManifest("chuyen-de-06", "dong-hoa-hoc");

  return (
    <PilotLessonShell
      articleId={ARTICLE_ID}
      lessonTitle={LESSON_TITLE}
      manifest={manifest}
      summary={SUMMARY}
      topicTitle={TOPIC_TITLE}
    >
      <LessonBody />
    </PilotLessonShell>
  );
}
