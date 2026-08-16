# Lesson Style Guide — XuyenLab Chemistry

> Phiên bản: 1.0 · Duyệt: Sếp (chờ xác nhận)  
> Mục tiêu: Nội dung **đơn giản · trực diện · rõ ràng** — học sinh đọc là hiểu ngay, không cần tự lọc.

---

## 1. Nguyên tắc biên tập nội dung

| Nguyên tắc | Làm | Không làm |
|---|---|---|
| **Kiến thức chuẩn** | Chỉ giữ công thức, định nghĩa, ví dụ minh họa | Dán nguyên văn DOCX / giáo trình |
| **Đoạn ngắn** | Tối đa 3–4 câu / đoạn | Đoạn dài >6 câu |
| **Câu trực tiếp** | "Tốc độ phản ứng là..." | "Người ta định nghĩa rằng tốc độ..." |
| **Không lặp ý** | Mỗi công thức xuất hiện 1 lần, giải thích 1 lần | Nhắc lại cùng khái niệm nhiều chỗ |
| **Không OCR garbage** | Xóa `Mol:3.10-3`, `t0,05 – x0,05` không rõ nghĩa | Giữ ký tự lỗi từ Word |

---

## 2. Cấu trúc bài học (mỗi mục lớn)

```
## Số. Tên mục

<Callout type="definition" title="Tên khái niệm">
  Định nghĩa ngắn gọn, 1–2 câu.
</Callout>

[Giải thích ngắn nếu cần — tối đa 3 câu]

$$công thức chính (display)$$

| ký hiệu | ý nghĩa | đơn vị |
|---|---|---|
| $v$ | tốc độ phản ứng | mol·L⁻¹·s⁻¹ |

<Callout type="note" title="Ghi nhớ">
  Điểm quan trọng cần nhớ, 1–3 bullet.
</Callout>

<Example title="Ví dụ: [mô tả ngắn]">
  [Đề bài ngắn gọn]
  <Solution>
    [Lời giải theo bước]
  </Solution>
</Example>
```

---

## 3. Quy tắc dùng component

| Tình huống | Component |
|---|---|
| Định nghĩa / định luật | `<Callout type="definition" title="...">` |
| Ghi nhớ / lưu ý quan trọng | `<Callout type="note" title="...">` |
| Cảnh báo lỗi thường gặp | `<Callout type="warning" title="...">` |
| Ví dụ có lời giải | `<Example title="..."><Solution>...</Solution></Example>` |
| Gợi ý (chưa giải) | `<Hint>...</Hint>` |
| Công thức display (xuống dòng) | `$$...$$` |
| Công thức inline | `$...$` |
| Hình, mô phỏng | `<ChemFigure .../>` — giữ nguyên |
| Bảng dữ liệu | `<DataTable .../>` — giữ nguyên |

**Cấm:** tự tạo component mới (`FormulaCard`, `KeyBox`, ...).

---

## 4. Công thức (KaTeX + mhchem)

- Luôn dùng `$$...$$` cho công thức cần tách dòng (Sếp đọc rõ hơn).
- Inline chỉ dùng `$...$` cho ký hiệu trong câu: "hằng số $k$ phụ thuộc nhiệt độ".
- Phản ứng hóa học: dùng `\ce{...}` (mhchem): `$\ce{2SO2 + O2 -> 2SO3}$`
- Tuyệt đối không để lộ `\dfrac`, `\text{`, `\rightarrow` trong text hiển thị thô.

---

## 4b. Quy tắc MDX/Prettier (bắt buộc)

| Vấn đề | Sai ❌ | Đúng ✅ |
|---|---|---|
| Bảng ký hiệu | Markdown pipe table (`\| ... \|`) | `<DataTable>` với `<Math>` cho từng ô công thức |
| Bullet trong Callout | `- item1\n- item2` (Prettier gộp dòng) | Blank line trước & sau list: `\n- item1\n- item2\n` |
| Multi-bullet trong JSX | `- a. - b.` (Prettier nối 1 dòng) | `\n\n- a.\n- b.\n\n` (blank line → MDX block mode) |

**Lý do:** app chưa có `remark-gfm`, nên Markdown table không render → dùng `<DataTable>`. Bullet trong JSX cần blank line bao quanh để MDX chuyển sang block-rendering mode.

## 5. Bảng chú thích ký hiệu (mỗi công thức mới)

Mỗi khi giới thiệu công thức có ≥ 3 ký hiệu, thêm bảng chú thích nhỏ:

```mdx
| Ký hiệu | Ý nghĩa | Đơn vị |
|---|---|---|
| $v$ | tốc độ phản ứng | $\text{mol·L}^{-1}\text{·s}^{-1}$ |
| $\Delta C$ | biến thiên nồng độ | $\text{mol·L}^{-1}$ |
| $\Delta t$ | khoảng thời gian | $\text{s}$ |
```

---

## 6. Ví dụ: Trước vs Sau biên tập

### ❌ Trước (trích nguyên DOCX)
> Tốc độ của một phản ứng hóa học (thường kí hiệu là v) là độ biến thiên nồng độ của một trong các chất phản ứng hoặc sản phẩm trong một đơn vị thời gian. Theo quy ước, nồng độ tính bằng mol/l, còn đơn vị thời gian có thể là giây (s), phút (ph), giờ (h),... Trường hợp chung, tốc độ v là hàm của nồng độ và nhiệt độ, nghĩa là v = f (C, T). Khi T = const thì y = f(C).

### ✅ Sau (chuẩn Style Guide)

```mdx
<Callout type="definition" title="Tốc độ phản ứng hóa học">
  Tốc độ phản ứng $v$ là độ biến thiên nồng độ của một chất (chất đầu hoặc sản phẩm) trong một đơn vị thời gian.
</Callout>

$$v = \pm\dfrac{\Delta C}{\Delta t}$$

| Ký hiệu | Ý nghĩa | Đơn vị |
|---|---|---|
| $\Delta C$ | biến thiên nồng độ | mol·L⁻¹ |
| $\Delta t$ | khoảng thời gian | s, ph, h |

<Callout type="note" title="Quy ước dấu">
  - Dấu **−** với chất **tham gia** (nồng độ giảm).  
  - Dấu **+** với chất **sản phẩm** (nồng độ tăng).
</Callout>
```

---

## 7. Checklist trước khi trình Sếp duyệt

- [ ] Mỗi khái niệm mới có `Callout type="definition"`  
- [ ] Công thức tách `$$...$$`, không lẫn trong văn bản  
- [ ] Bảng chú thích ký hiệu đầy đủ  
- [ ] Đoạn văn ≤ 4 câu  
- [ ] Không có text OCR lỗi  
- [ ] Ví dụ có `<Example>` + `<Solution>`  
- [ ] Không tự tạo component mới  

## 8. Traceability (bắt buộc — quan trọng hơn cả tính súc tích)

Mỗi `{/* T06-S01:eXXXX */}` là chứng từ QA đã được Owner duyệt.
**Công thức được duyệt PHẢI nằm ngay sau tracer**, dù nó có vẻ trùng lặp với công thức khác:

```mdx
{/* T06-S01:e0469 */}

$$\bar{v} = -\dfrac{\Delta C_A}{\Delta t} = ...$$ {/* giữ nguyên — tracer contract */}
```

**KHÔNG** chỉ để ghost comment `{/* T06-S01:eXXXX */}` không có formula đi kèm.
Nếu formula thực sự trùng lặp → ghi chú bằng comment MDX `{/* same as e1520 above */}` nhưng vẫn giữ formula.
