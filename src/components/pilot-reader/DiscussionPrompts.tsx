import type { DiscussionPromptEntry } from "@/features/content/remediation-queue";

import styles from "./DiscussionPrompts.module.css";

interface Props {
  items: DiscussionPromptEntry[];
}

/**
 * Presents `discussionPrompt` entries (docs/contracts/content.md
 * "Discussion prompt"). Purely a read model over already-declared queue
 * data — never generates a prompt. Renders nothing when `items` is empty.
 */
export function DiscussionPrompts({ items }: Props) {
  if (items.length === 0) return null;

  return (
    <section
      aria-labelledby="discussion-prompts-heading"
      className={styles.section}
    >
      <h2 id="discussion-prompts-heading">Câu hỏi thảo luận trên lớp</h2>
      <ul className={styles.list}>
        {items.map((item) => (
          <li className={styles.item} key={item.issueId}>
            <p className={styles.objective}>{item.promptOrObjective}</p>
            <p className={styles.provenance}>
              <code>{item.issueId}</code> · Nguồn <code>{item.sourceId}</code>
            </p>
            <p className={styles.recorded}>
              Ghi nhận bởi {item.recordedBy} · {item.recordedDate}
            </p>
            <p className={styles.scientificStatus}>
              Không phải kết luận khoa học đã được xác minh.
            </p>
            <p className={styles.identityWarning}>
              Danh tính khai báo; chưa được xác thực bằng tài khoản.
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
