/** Synthetic P3 fixture. It is intentionally outside content/topics and is not publishable. */
export const STAGING_TOPIC_SLUG = "p3-fixture";
export const STAGING_LESSON_SLUG = "p3-can-bang-hoa-hoc";

export const stagingLesson = {
  topic: "P3 · Bài kiểm tra riêng tư",
  title: "Cân bằng hóa học — fixture staging",
  summary:
    "Bài học synthetic để kiểm tra reader, không phải nội dung Hóa học đã duyệt.",
  headings: [
    { id: "can-bang-hoa-hoc", label: "1. Cân bằng hóa học" },
    { id: "vi-du", label: "2. Ví dụ minh họa" },
    { id: "tu-kiem-tra", label: "3. Tự kiểm tra" },
  ],
} as const;
