# Lesson style guide — XuyenLab Chemistry

**Chốt:** đơn giản · trực diện · rõ ràng (Gemini-style) — học sinh đọc là hiểu, không phải tự lọc chữ.

Áp dụng cho **mọi** bài trong `content/topics/<chuyen-de-slug>/<lesson-slug>.mdx` (canonical layout —
xem `docs/contracts/content.md`), không chỉ pilot. Pilot hiện tại: **CD06 — Động hóa học**
(`chuyen-de-06/dong-hoa-hoc.mdx`, đã có bài, đang `in_review`) và **CD08 — Dung dịch và cân bằng
hóa học** (`chuyen-de-08/dung-dich-va-can-bang-hoa-hoc.mdx`, nguồn DOCX "8.1. Chuyen de 8- Dung
dich can bang hoa hoc- phan I & II"). CD08 **không phải** Ancol/Amin/Polime.

Không dán nguyên văn DOCX. Không viết văn khoa sáo.

---

## 1. Nguyên tắc biên tập

| Làm                                                                  | Không làm                                |
| -------------------------------------------------------------------- | ---------------------------------------- |
| Chỉ giữ kiến thức chuẩn + công thức đúng                             | Dán nguyên văn DOCX / slide              |
| Đoạn văn **≤ 4 câu**                                                 | Đoạn > 6 câu, một khối chữ dài           |
| Câu trực tiếp: "Tốc độ là…"                                          | "Người ta định nghĩa rằng…"              |
| Mỗi công thức xuất hiện **1 lần**, giải thích **1 lần**              | Nhắc lại cùng một ý ở nhiều chỗ          |
| Xóa mọi rác OCR/converter (`t0,05–x`, `ext`, `ightarrow`, ký tự lạ…) | Giữ nguyên rác từ Word/converter         |
| Kiến thức HSG = `Callout type="note"` ngắn, gắn liền mục liên quan   | Trộn mẹo HSG rời rạc giữa các định nghĩa |

## 2. Cấu trúc mỗi mục

```mdx
## N. Tên mục

<Callout type="definition" title="Tên khái niệm">
  Định nghĩa ngắn, 1–2 câu.
</Callout>

Giải thích ngắn nếu cần — tối đa 3 câu.

$$
công\_thức\_chính
$$

| Ký hiệu | Ý nghĩa | Đơn vị |
| ------- | ------- | ------ |
| …       | …       | …      |

<Callout type="note" title="Ghi nhớ">
  - Bullet ngắn.
</Callout>

<Example title="Ví dụ: mô tả ngắn">
  Đề bài ngắn.

  <Solution>
    Lời giải từng bước. Công thức tách khối `$$...$$`.
  </Solution>
</Example>
```

**Thứ tự ưu tiên trong một mục:** định nghĩa → công thức → bảng ký hiệu → ghi nhớ → ví dụ.

## 3. Component cho phép

Danh sách component MDX hợp lệ = đúng những gì `mdx-components.tsx` đăng ký, khớp
`docs/contracts/content.md` §"Supported MDX components". **Không có gì khác.**

| Component                                 | Vị trí định nghĩa                              | Dùng khi                                 |
| ----------------------------------------- | ---------------------------------------------- | ---------------------------------------- |
| `<Callout type="..." title="...">`        | `src/components/mdx/Callout/Callout.tsx`       | Xem bảng type bên dưới                   |
| `<Example title="...">`                   | `src/components/mdx/Example/Example.tsx`       | Bọc đề bài + Solution/Hint               |
| `<Solution>`                              | `src/components/mdx/Solution/Solution.tsx`     | Lời giải, thu gọn mặc định               |
| `<Hint>`                                  | `src/components/mdx/Hint/Hint.tsx`             | Gợi ý, thu gọn mặc định                  |
| `<ChemFigure src alt caption? sourceId?>` | `src/components/mdx/ChemFigure/ChemFigure.tsx` | Hình/sơ đồ không thể viết lại bằng KaTeX |
| `<DataTable caption?>`                    | `src/components/mdx/DataTable/DataTable.tsx`   | Bảng dữ liệu (bọc `<table>` chuẩn)       |

**`Callout` chỉ có đúng 3 `type` hợp lệ** (khớp `CalloutType` trong component — không phải danh
sách dài "remember/important/misconception/formula/tip/…" từng lưu hành ở bản nháp trước, những
type đó **không tồn tại** trong code và sẽ render sai):

| `type`       | Dùng khi                             |
| ------------ | ------------------------------------ |
| `definition` | Khái niệm mới                        |
| `note`       | Ghi chú / đơn vị / ghi nhớ / mẹo HSG |
| `warning`    | Cảnh báo nhầm lẫn thường gặp         |

**Cấm:** tự tạo component MDX mới · HTML layout tự chế · CSS inline · gán `Callout type` không có
trong bảng trên.

## 4. Math & hóa học

- Công thức **tách khối** `$$...$$` — không để công thức dài lẫn trong đoạn văn.
- Inline chỉ cho ký hiệu ngắn: `$v$`, `$\Delta C$`, `$T$`.
- Phản ứng/công thức hóa dùng `mhchem` qua `\ce{...}`:

  ```mdx
  $$\ce{2SO2 + O2 <=> 2SO3}$$
  ```

- `$$`/`$` được xử lý trực tiếp qua `remark-math` + `rehype-katex` (khai báo trong
  `next.config.ts`) — không cần bọc `<Math>`, không cần plugin thêm.
- Viết đúng LaTeX: `\to`, `\dfrac{}{}`, `\text{...}`, `\pm`. Không dán rác converter
  (`ext` thay cho `\text`, `ightarrow` thay cho `\rightarrow`, `o 0` thay cho `\to 0`…).
- Chọn **một** style ký hiệu nồng độ cho cả bài, ví dụ `C_{\ce{SO2}}`, và giữ nhất quán.

## 5. Độ dài gợi ý (một mục nhỏ, ví dụ I.1)

| Phần                   | Gợi ý                 |
| ---------------------- | --------------------- |
| Callout definition     | 1–2 câu               |
| Giải thích             | ≤ 3 câu               |
| Công thức chính        | 1 khối `$$`           |
| Bảng ký hiệu           | 2–5 hàng              |
| Callout note (ghi nhớ) | 2–4 bullet            |
| Example                | 1 đề + 1 Solution gọn |

Tham chiếu: một mục DOCX gốc thường dài nguyên văn nhiều trăm dòng; bản MDX mục tiêu **mỏng, rõ**
— cùng ý, ít dòng hơn nhiều. Sample I.1–I.2 minh họa mức ~70 dòng thay vì hàng trăm dòng dán Word.

## 6. Frontmatter (nhắc nhanh)

Schema đầy đủ đã đóng băng ở `docs/contracts/content.md` — **đọc file đó**, không copy lại ở đây.
Nhắc nhanh phần hay quên:

- `status: draft` khi soạn mới; đổi sang `in_review` khi vào hàng chờ QA; `published` **chỉ Owner**
  đặt, không bao giờ tự đặt.
- `topic`, `slug`, `order`, `summary`, `keywords`, `estimatedMinutes`, `sourceFiles`, `version` là
  bắt buộc — mỗi `sourceFiles[].sourceId` phải khớp một dòng trong `docs/source-manifest.csv`.
- Không secret, không PII học sinh thật, không upload PDF lên R2 trong task nội dung.

## 7. Checklist trước khi trình Owner

- [ ] Mỗi khái niệm mới có `<Callout type="definition">`
- [ ] Công thức tách `$$`, không lẫn dài trong văn xuôi
- [ ] Có bảng chú thích ký hiệu khi có công thức nhiều biến
- [ ] Mọi đoạn văn ≤ 4 câu
- [ ] Ví dụ dùng `<Example>` + `<Solution>` (và `<Hint>` nếu cần)
- [ ] Không còn text OCR/converter rác (`ext`, `ightarrow`, `o 0`, …)
- [ ] Chỉ dùng component + `Callout type` trong §3
- [ ] `npm run content:validate` xanh
- [ ] Đọc lại một lượt: "Học sinh lớp 11 có hiểu ngay không?"

---

**Xem thêm:**

- Quy trình vận hành cho mọi chuyên đề: [`CONTENT-WORKFLOW.md`](./CONTENT-WORKFLOW.md)
- Sample đã chốt: [`samples/SAMPLE-I1-toc-do-phan-ung.mdx`](./samples/SAMPLE-I1-toc-do-phan-ung.mdx)
- Schema/QA/status đầy đủ: [`../contracts/content.md`](../contracts/content.md) (đã đóng băng —
  sửa cần ADR/handoff riêng, không sửa qua task nội dung)

_Chốt style = chốt sample. Đọc guide này + sample trước khi soạn tiếp bất kỳ chuyên đề nào._
