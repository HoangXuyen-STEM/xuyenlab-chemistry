import styles from "./StagingLimitationNotice.module.css";

/**
 * Required, verbatim notice (P6-B1.3U): visible on mobile, desktop and
 * print, never hidden behind interaction, and exposed as a labelled note —
 * unlike PilotLessonShell's decorative per-status banner (`[BẢN NHÁP
 * PILOT]`/`[BẢN ĐANG DUYỆT]`, `aria-hidden`, hidden in print), this is a
 * real accessible landmark that must survive every rendering context, and
 * its wording is staging policy — independent of any single lesson's
 * `draft`/`in_review` lifecycle status. See
 * docs/handoffs/P6/P6-B1.3U-claude.md for the exact wording requirement.
 */
export function StagingLimitationNotice() {
  return (
    <aside
      aria-label="Lưu ý bản đang duyệt"
      className={styles.notice}
      role="note"
    >
      <p>
        Bản đang duyệt — sử dụng dưới hướng dẫn giáo viên. Một số giới hạn
        chuyển đổi được giữ theo nguồn và không phải nội dung khoa học mới do hệ
        thống xác nhận.
      </p>
    </aside>
  );
}
