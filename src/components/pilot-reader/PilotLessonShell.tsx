import Link from "next/link";

import type {
  AcceptedLimitation,
  DiscussionPromptEntry,
} from "@/features/content/remediation-queue";
import type { PilotLessonManifestEntry } from "@/features/content/pilot-manifest";

import { AcceptedLimitations } from "./AcceptedLimitations";
import { DiscussionPrompts } from "./DiscussionPrompts";
import { PilotHeadingNav } from "./PilotHeadingNav";
import { PilotPrintButton } from "./PilotPrintButton";
import { StagingLimitationNotice } from "./StagingLimitationNotice";

import styles from "./PilotLessonShell.module.css";

interface PilotLessonShellProps {
  topicTitle: string;
  lessonTitle: string;
  summary: string;
  manifest: PilotLessonManifestEntry;
  articleId: string;
  acceptedLimitations?: AcceptedLimitation[];
  discussionPrompts?: DiscussionPromptEntry[];
  children: React.ReactNode;
}

/**
 * Shared shell for the P4 no-login pilot staging routes. Mirrors the
 * `[FIXTURE]`/`[STAGING REVIEW]` banner pattern from `/fixtures/mdx` and
 * `/fixtures/conversion-review`: a visible non-production banner, then the
 * compiled MDX lesson body inside a print-tuned prose column.
 */
export function PilotLessonShell({
  topicTitle,
  lessonTitle,
  summary,
  manifest,
  articleId,
  acceptedLimitations = [],
  discussionPrompts = [],
  children,
}: PilotLessonShellProps) {
  return (
    <main className={styles.page}>
      <div className={styles.banner} aria-hidden="true">
        <span className={styles.bannerLabel}>
          [BẢN NHÁP PILOT] — Xem trước staging, không cần đăng nhập — chưa xuất
          bản
        </span>
      </div>
      <StagingLimitationNotice />
      <nav aria-label="Điều hướng" className={styles.breadcrumbs}>
        <Link href="/fixtures/pilot">Danh sách pilot</Link>
        <span aria-hidden="true">/</span>
        <span>{topicTitle}</span>
      </nav>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>{topicTitle}</p>
          <h1>{lessonTitle}</h1>
          <p className={styles.summary}>{summary}</p>
          <p className={styles.provenance}>
            Nguồn: <code>{manifest.sourceId}</code> ·{" "}
            <code>{manifest.sourcePath}</code>
          </p>
          <p className={styles.qaCounts}>
            <span className={styles.blockingCount}>
              {manifest.blockingCount} mục chặn xuất bản
            </span>{" "}
            ·{" "}
            <span className={styles.warningCount}>
              {manifest.warningCount} cảnh báo
            </span>{" "}
            — mỗi mục giữ nguyên ID ổn định để Chủ dự án QA đối chiếu.
          </p>
        </div>
        <PilotPrintButton />
      </header>
      <div className={styles.layout}>
        <PilotHeadingNav articleId={articleId} />
        <article className={styles.prose} id={articleId}>
          {children}
          <AcceptedLimitations items={acceptedLimitations} />
          <DiscussionPrompts items={discussionPrompts} />
        </article>
      </div>
    </main>
  );
}
