# P4 remediation queue — Chuyên đề 6 & 8

- Status: Draft triage data for the project owner (P4.4). Nothing here
  changes a lesson's `draft` status, chemical content, or the underlying
  `content/qa/pending/*.json` QA records.
- Generated from `content/qa/pending/*.remediation-queue.json`, which is
  itself generated read-only from the two source `.docx` files and the
  P4.1 failure reports. See
  `docs/handoffs/P4/P4.4-remediation-triage-claude.md` for exact
  reproduction commands.

## How to use this queue

1. Read the **7 sample issues** below first — they walk through what
   `observedType`/`observedTypeEvidence`/preview mean using real examples.
2. Open the full per-topic table and, for each row, decide one of:
   - `reviewed-latex-mdx` — the content should become real KaTeX/mhchem
     (a separate content task then does the actual conversion);
   - `reviewed-image-fallback` — a reviewed image is the right fallback
     (a separate task adds a real `ChemFigure`, not the QA preview image);
   - `remain-blocking` — leave it blocking for now (e.g. still unclear).
3. Record the decision, alt text/caption (if `reviewed-image-fallback`)
   and any QA note directly in the matching
   `content/qa/pending/<lesson>.remediation-queue.json` entry's
   `ownerDecision` object. This queue file does not itself unblock
   publication — `docs/contracts/content.md`'s `LessonQaRecord` in
   `content/qa/pending/<lesson>.json` is still the record that must be
   completed and signed before a lesson can move to `in_review`.

## Summary

| | Blocking | Warning | Total |
| --- | ---: | ---: | ---: |
| Chuyên đề 6 · Động hóa học | 96 | 3 | 99 |
| Chuyên đề 8 · Dung dịch và cân bằng hóa học | 126 | 42 | 168 |
| **Tổng** | **222** | **45** | **267** |

### Theo loại object quan sát được

| Loại | Chuyên đề 6 | Chuyên đề 8 | Tổng |
| --- | ---: | ---: | ---: |
| Công thức (`formula`) | 95 | 123 | 218 |
| Bảng (`table`) | 3 | 11 | 14 |
| Hình (`figure`) | 0 | 31 | 31 |
| Chưa xác định (`unknown`) | 1 | 3 | 4 |

### Chi tiết theo Chuyên đề

- [Chuyên đề 6 · Động hóa học](./p4-remediation-queue-chuyen-de-06.md) — 99 mục
- [Chuyên đề 8 · Dung dịch và cân bằng hóa học](./p4-remediation-queue-chuyen-de-08.md) — 168 mục

## 7 issue mẫu — kiểm tra trước

Bảy issue này được liệt kê tường minh trong yêu cầu triage; xem trước để
hiểu quy trình trước khi đọc bảng đầy đủ bên dưới.

### `T06-S01:e6259`

- **Nguồn:** `T06-S01` · **Mức độ:** 🔴 Chặn xuất bản
- **issueCode:** `UNSUPPORTED_OLE_OBJECT` · **kind:** `embeddedObject`
- **Vị trí:** `word/document.xml#body/block[9]/w:object[1]`
- **Loại quan sát được:** Công thức
- **Căn cứ:** &lt;o:OLEObject ProgID="Equation.DSMT4"&gt; (MathType (Equation.DSMT4)) read directly from the source DOCX XML.

  ![preview](/qa-preview/lessons/chuyen-de-06/e6259.png)

### `T06-S01:e5248`

- **Nguồn:** `T06-S01` · **Mức độ:** 🔴 Chặn xuất bản
- **issueCode:** `UNSUPPORTED_OLE_OBJECT` · **kind:** `embeddedObject`
- **Vị trí:** `word/document.xml#body/block[9]/w:object[2]`
- **Loại quan sát được:** Công thức
- **Căn cứ:** &lt;o:OLEObject ProgID="Equation.DSMT4"&gt; (MathType (Equation.DSMT4)) read directly from the source DOCX XML.

  ![preview](/qa-preview/lessons/chuyen-de-06/e5248.png)

### `T06-S01:e4743`

- **Nguồn:** `T06-S01` · **Mức độ:** 🔴 Chặn xuất bản
- **issueCode:** `UNSUPPORTED_OLE_OBJECT` · **kind:** `embeddedObject`
- **Vị trí:** `word/document.xml#body/block[10]/w:object[1]`
- **Loại quan sát được:** Công thức
- **Căn cứ:** &lt;o:OLEObject ProgID="Equation.DSMT4"&gt; (MathType (Equation.DSMT4)) read directly from the source DOCX XML.

  ![preview](/qa-preview/lessons/chuyen-de-06/e4743.png)

### `T06-S01:e9544`

- **Nguồn:** `T06-S01` · **Mức độ:** 🔴 Chặn xuất bản
- **issueCode:** `UNSUPPORTED_OLE_OBJECT` · **kind:** `embeddedObject`
- **Vị trí:** `word/document.xml#body/block[12]/w:object[1]`
- **Loại quan sát được:** Công thức
- **Căn cứ:** &lt;o:OLEObject ProgID="Equation.DSMT4"&gt; (MathType (Equation.DSMT4)) read directly from the source DOCX XML.

  ![preview](/qa-preview/lessons/chuyen-de-06/e9544.png)

### `T08-S01:e7414`

- **Nguồn:** `T08-S01` · **Mức độ:** 🔴 Chặn xuất bản
- **issueCode:** `UNSUPPORTED_OLE_OBJECT` · **kind:** `embeddedObject`
- **Vị trí:** `word/document.xml#body/block[7]/w:object[1]`
- **Loại quan sát được:** Công thức
- **Căn cứ:** &lt;o:OLEObject ProgID="Equation.DSMT4"&gt; (MathType (Equation.DSMT4)) read directly from the source DOCX XML.

  ![preview](/qa-preview/lessons/chuyen-de-08/e7414.png)

### `T08-S01:e3055`

- **Nguồn:** `T08-S01` · **Mức độ:** 🔴 Chặn xuất bản
- **issueCode:** `UNSUPPORTED_OLE_OBJECT` · **kind:** `embeddedObject`
- **Vị trí:** `word/document.xml#body/block[7]/w:object[2]`
- **Loại quan sát được:** Công thức
- **Căn cứ:** &lt;o:OLEObject ProgID="Equation.DSMT4"&gt; (MathType (Equation.DSMT4)) read directly from the source DOCX XML.

  ![preview](/qa-preview/lessons/chuyen-de-08/e3055.png)

### `T08-S01:e6352`

- **Nguồn:** `T08-S01` · **Mức độ:** 🔴 Chặn xuất bản
- **issueCode:** `UNSUPPORTED_OLE_OBJECT` · **kind:** `embeddedObject`
- **Vị trí:** `word/document.xml#body/block[7]/w:object[3]`
- **Loại quan sát được:** Công thức
- **Căn cứ:** &lt;o:OLEObject ProgID="Equation.DSMT4"&gt; (MathType (Equation.DSMT4)) read directly from the source DOCX XML.

  ![preview](/qa-preview/lessons/chuyen-de-08/e6352.png)

## Ranh giới

- Không có nội dung Hóa học nào bị sửa để tạo tài liệu này.
- Không có ID hoặc mức độ (severity) nào bị xoá hay hạ cấp; xem
  `tests/content/remediation-queue.test.ts` để kiểm chứng tự động.
- Ảnh preview chỉ dùng để Owner xem trước, **chưa** phải fallback
  publish — xem `public/qa-preview/README.md`.

