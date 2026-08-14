import type { AcceptedLimitation } from "@/features/content/remediation-queue";

import styles from "./AcceptedLimitations.module.css";

const CHOICE_LABEL: Record<AcceptedLimitation["remediationChoice"], string> = {
  "owner-accepted-source-fidelity": "Giữ nguyên theo nguồn (bảng)",
  "owner-accepted-visible-fallback": "Giữ nguyên ảnh thay thế gốc (hình)",
};

interface Props {
  items: AcceptedLimitation[];
}

/**
 * Presents `accepted-with-limitation` remediation-queue items
 * (docs/contracts/content.md "Remediation queue"). Renders nothing when
 * `items` is empty — the page-level `StagingLimitationNotice` is what must
 * stay visible unconditionally, not this section.
 */
export function AcceptedLimitations({ items }: Props) {
  if (items.length === 0) return null;

  return (
    <section
      aria-labelledby="accepted-limitations-heading"
      className={styles.section}
    >
      <h2 id="accepted-limitations-heading">
        Giới hạn được Chủ dự án chấp nhận
      </h2>
      <p className={styles.disclaimer}>
        Các mục dưới đây được Chủ dự án xem xét và giữ nguyên theo nguồn. Đây
        không phải nội dung khoa học mới do hệ thống xác nhận, và không phải đã
        được sửa, hoàn thiện hay xuất bản.
      </p>
      <ul className={styles.list}>
        {items.map((item) => (
          <li className={styles.item} key={item.issueId}>
            <p className={styles.type}>
              {CHOICE_LABEL[item.remediationChoice]}
            </p>
            <p className={styles.provenance}>
              <code>{item.issueId}</code> · Nguồn <code>{item.sourceId}</code>
            </p>
            <p className={styles.note}>{item.qaNote}</p>
            {item.remediationChoice === "owner-accepted-visible-fallback" ? (
              <p className={styles.fallbackDisclaimer}>
                Ảnh giữ nguyên chú thích thay thế gốc; chưa có mô tả thay thế
                (alt text) mới hay cải thiện khả năng tiếp cận nào được thêm
                vào.
              </p>
            ) : null}
            <p className={styles.decided}>
              Quyết định bởi {item.decidedBy} · {item.decidedAt}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
