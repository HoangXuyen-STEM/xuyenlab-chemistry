import T06DocxSamples from "../../../../content/fixtures/conversion-review/t06-docx.mdx";
import T06HtmlSamples from "../../../../content/fixtures/conversion-review/t06-html.mdx";
import T08DocxSamples from "../../../../content/fixtures/conversion-review/t08-docx.mdx";
import T08HtmlSamples from "../../../../content/fixtures/conversion-review/t08-html.mdx";

import styles from "./page.module.css";

const sources = [
  {
    id: "T06-S01",
    format: "DOCX nguồn chính",
    path: "6. Chuyen de 6. Dong hoa hoc.ok.docx",
    samples: "04–06",
  },
  {
    id: "T06-S02",
    format: "HTML tham chiếu",
    path: "6. Dong hoa hoc - ly thuyet.html",
    samples: "01–03",
  },
  {
    id: "T08-S01",
    format: "DOCX nguồn chính",
    path: "8.1. Chuyen de 8-  Dung dich can bang hoa hoc- phan I & II OK (1).docx",
    samples: "10–12",
  },
  {
    id: "T08-S02",
    format: "HTML tham chiếu",
    path: "8.1. Chuyen de 8 - Dung dich, Can bang hoa hoc - Ly thuyet (Phan I).html",
    samples: "07–09",
  },
] as const;

export default function ConversionReviewPage() {
  return (
    <div className={styles.fixtureRoot}>
      <div className={styles.fixtureHeader}>
        [STAGING REVIEW] — Không phải bài học xuất bản — P2.4
      </div>
      <main className={styles.prose}>
        <h1>Đối chiếu mẫu chuyển đổi P2.4</h1>
        <p className={styles.subtitle}>
          12 trích đoạn từ output converter T06/T08. Đây là dữ liệu nháp để Chủ
          dự án chọn chiến lược, không phải nội dung hóa học đã duyệt.
        </p>

        <section className={styles.instructions} aria-labelledby="review-steps">
          <h2 id="review-steps">Cách đối chiếu và quyết định</h2>
          <ol>
            <li>
              Mở đúng tệp nguồn bên dưới, đối chiếu văn bản, chỉ số dưới/trên,
              bảng và hình.
            </li>
            <li>
              Đánh dấu từng mẫu: giữ được ý nghĩa, cần sửa tay, hay không thể
              dùng tự động.
            </li>
            <li>
              Chọn một kết luận: A — DOCX là nguồn chính; B — HTML là nguồn
              chính; C — cần biên tập thủ công/hybrid.
            </li>
          </ol>
          <p>
            Hình chỉ được báo cáo là asset/fallback: asset nháp không được triển
            khai trên preview, nên phần hình hiện là <strong>UNVERIFIED</strong>
            .
          </p>
        </section>

        <h2>Nguồn và phạm vi mẫu</h2>
        <div className={styles.sourceGrid}>
          {sources.map((source) => (
            <article className={styles.sourceCard} key={source.id}>
              <h3>
                {source.id} · Mẫu {source.samples}
              </h3>
              <p>{source.format}</p>
              <code>{source.path}</code>
            </article>
          ))}
        </div>

        <section aria-labelledby="t06-html">
          <h2 id="t06-html">Chuyên đề 6 · HTML</h2>
          <T06HtmlSamples />
        </section>
        <section aria-labelledby="t06-docx">
          <h2 id="t06-docx">Chuyên đề 6 · DOCX</h2>
          <T06DocxSamples />
        </section>
        <section aria-labelledby="t08-html">
          <h2 id="t08-html">Chuyên đề 8 · HTML</h2>
          <T08HtmlSamples />
        </section>
        <section aria-labelledby="t08-docx">
          <h2 id="t08-docx">Chuyên đề 8 · DOCX</h2>
          <T08DocxSamples />
        </section>
      </main>
    </div>
  );
}
