# Content workflow — mọi chuyên đề

**Chuẩn biên tập bắt buộc:** [`LESSON-STYLE-GUIDE.md`](./LESSON-STYLE-GUIDE.md)
**Mẫu đã chốt (Owner duyệt):** [`samples/SAMPLE-I1-toc-do-phan-ung.mdx`](./samples/SAMPLE-I1-toc-do-phan-ung.mdx)
**Schema/QA đầy đủ (đóng băng):** [`../contracts/content.md`](../contracts/content.md)

Áp dụng cho **mọi** chuyên đề (CD01–CD12 và các CD khác đã/sẽ import), không chỉ hai pilot hiện
tại. Pilot hiện tại: **CD06 — Động hóa học** (`content/topics/chuyen-de-06/dong-hoa-hoc.mdx`, đã
có bài, `status: in_review`) và **CD08 — Dung dịch và cân bằng hóa học**
(`content/topics/chuyen-de-08/dung-dich-va-can-bang-hoa-hoc.mdx`, nguồn DOCX "8.1. Chuyen de 8-
Dung dich can bang hoa hoc- phan I & II"). CD08 **không phải** Ancol/Amin/Polime.

Repo root cho toàn bộ workflow này: `/home/hoang-xuyen/Projects/HSG-Chemistry/HSG-11`.

---

## 1. Nguyên tắc (không đàm phán)

1. **Không dán nguyên văn DOCX/PDF/slide** — biên tập lại theo `LESSON-STYLE-GUIDE.md`.
2. **Chỉ dùng component + `Callout type` đã liệt kê trong style guide §3** — không tự tạo mới.
3. **`status: published` chỉ Owner đặt.** Mặc định soạn mới/import = `draft`.
4. **Không** secret, không PII học sinh thật, không upload PDF lên R2 trong task nội dung.
5. **Một PR = một concern** — nội dung tách khỏi auth/infra/QA pipeline/remediation-queue.
6. **Không rewrite hàng loạt.** Sample trước → 1–2 bài pilot ổn → mới mở rộng.

Chi tiết "đoạn ≤ 4 câu / cấu trúc mục / component" → đọc `LESSON-STYLE-GUIDE.md` (khoảng 3 phút).
Không copy lại nội dung đó ở đây.

## 2. Luồng A — Chuyên đề / bài mới

```text
DOCX/nguồn xác thực trong docs/source-manifest.csv
  → (khuyến nghị) sample 1 mục nhỏ trình Owner nếu CD mới hoặc style còn tranh cãi
  → tạo content/topics/chuyen-de-{NN}/{lesson-slug}.mdx  (status: draft)
  → biên tập từng mục theo LESSON-STYLE-GUIDE.md
  → npm run content:validate (+ verify theo AGENTS.md)
  → PR nội dung riêng, không gộp thay đổi hạ tầng
  → Owner duyệt → status: in_review, rồi published theo quyết định riêng của Owner
```

### Checklist PR content mới

- [ ] Đã đọc `LESSON-STYLE-GUIDE.md` trong cùng PR hoặc `main`
- [ ] Frontmatter đủ field theo `docs/contracts/content.md` (`topic`, `title`, `slug`, `order`,
      `summary`, `keywords`, `estimatedMinutes`, `sourceFiles`, `version`, `status`)
- [ ] `status: draft` — **không tự đặt** `in_review` hay `published`
- [ ] Mỗi khái niệm mới có `<Callout type="definition">`
- [ ] Công thức tách `$$`; có bảng ký hiệu khi công thức nhiều biến
- [ ] Ví dụ dùng `<Example>` + `<Solution>` (và `<Hint>` nếu cần)
- [ ] Không còn rác OCR/converter; mỗi đoạn ≤ 4 câu
- [ ] `npm run content:validate` xanh
- [ ] Không đụng pipeline QA / remediation-queue trừ khi task riêng giao việc đó

### Vị trí và tên file

```text
content/topics/chuyen-de-{NN}/{lesson-slug}.mdx
```

`lesson-slug` là ASCII kebab-case, mô tả nội dung (không phải số thứ tự), ví dụ
`dung-dich-va-can-bang-hoa-hoc`. `topic` trong frontmatter khớp `chuyen-de-{NN}`, `order` khớp vị
trí bài trong chuyên đề. Xem `content/topics.ts` cho danh sách chuyên đề đã đăng ký.

## 3. Luồng B — Remediation bài đã có

Dùng khi bài cũ dài, còn dán gần nguyên văn DOCX, hoặc lệch guide — kể cả hai pilot CD06/CD08 hiện
tại, vốn vẫn còn nhiều đoạn `in_review` dán gần nguyên văn (xem ghi chú trong
`LESSON-STYLE-GUIDE.md` §mở đầu).

```text
Chọn một bài (hoặc một mục trong bài, không cả bài cùng lúc)
  → so với SAMPLE-I1 + LESSON-STYLE-GUIDE.md
  → viết lại đúng phần lệch — không "polish" sáo, không đổi ý nghĩa hóa học
  → giữ tracer/sourceId hiện có trong MDX (comment dạng {/* T0X-S0Y:eNNNN */}) nếu bài đang dùng
  → status giữ nguyên trừ khi Owner yêu cầu đổi; không tự chuyển sang published
  → PR nhỏ, dễ diff — không rewrite cả file trong một PR
```

### Ưu tiên remediation

| Ưu tiên | Đối tượng                                                                 |
| ------- | ------------------------------------------------------------------------- |
| P0      | CD06 / CD08 khi Owner chỉ định mục cụ thể                                 |
| P1      | Bài có phản hồi "dài / khó hiểu"                                          |
| P2      | Bài còn rõ ràng là dán Word/OCR                                           |
| P3      | Chuẩn hóa các CD khác — **chỉ sau** khi sample + 1–2 bài pilot đã ổn định |

**Cấm:** viết lại cả một chuyên đề trong một PR khổng lồ mà không qua duyệt mẫu trước.

## 4. Luồng C — Chuyên đề mới, nhiều bài

1. Xác định nguồn DOCX đã có trong `docs/source-manifest.csv` + outline các phần (I, II, …).
2. Nếu CD đó chưa có sample: viết **một mục nhỏ** (như I.1) dưới `docs/content/samples/`, trình
   Owner duyệt style trước khi làm tiếp.
3. Tạo các file `.mdx` ở trạng thái `draft` với khung `##`/`###` theo outline (chưa cần đầy đủ nội
   dung).
4. Viết đầy đủ từng mục theo `LESSON-STYLE-GUIDE.md`.
5. `npm run content:validate` (và verify theo `AGENTS.md`).
6. Chia PR theo lô nhỏ (vài mục/PR) thay vì một PR cho cả chuyên đề.

CD08 hiện đang theo luồng này: nguồn DOCX _Dung dịch – cân bằng hóa học_ phần I & II; style đã
chốt qua sample tốc độ phản ứng (lưu ý: sample đó minh họa nội dung thuộc CD06 — xem ghi chú trong
chính file sample).

## 5. Vòng đời `status`

| `status`    | Ý nghĩa                                                             | Ai quyết                               |
| ----------- | ------------------------------------------------------------------- | -------------------------------------- |
| `draft`     | Đang soạn / import tự động                                          | Agent có thể tự đặt khi tạo mới        |
| `in_review` | Đã vào hàng chờ QA, có `qa` record theo `docs/contracts/content.md` | Agent đề xuất, cần checklist QA đầy đủ |
| `published` | Vào catalog học sinh nhìn thấy                                      | **Chỉ Owner** — không bao giờ tự đặt   |

Không "publish giúp cho đủ bài". `approvedForPublish: true` trong QA record cũng chỉ Owner được
đặt — xem `docs/contracts/content.md` §QA record và §Amendments cho các trường hợp ngoại lệ đã
được Owner ký duyệt cho từng bài cụ thể.

## 6. Việc AI/agent phải làm trước khi soạn

1. Đọc [`LESSON-STYLE-GUIDE.md`](./LESSON-STYLE-GUIDE.md).
2. Đọc sample liên quan, tối thiểu
   [`SAMPLE-I1-toc-do-phan-ung.mdx`](./samples/SAMPLE-I1-toc-do-phan-ung.mdx).
3. Xác nhận `Callout` type hợp lệ trực tiếp trong `src/components/mdx/Callout/Callout.tsx` —
   không tin danh sách cũ, không bịa type mới.
4. Đọc schema frontmatter/QA trong `docs/contracts/content.md` (đã đóng băng — không sửa qua task
   nội dung).
5. Soạn/PR theo checklist §2 (bài mới) hoặc §3 (remediation).

### Việc AI/agent không được làm

- Tự đặt `status: published` hoặc `approvedForPublish: true` khi không có lệnh rõ của Owner
- Tạo component MDX mới hoặc `Callout type` ngoài danh sách trong style guide
- Rewrite hàng loạt `content/topics/**` trong một task/PR
- Merge PR hạ tầng/auth trong cùng PR nội dung
- Sửa `docs/contracts/content.md`, pipeline QA hoặc remediation-queue "tiện tay" ngoài phạm vi
  task được giao
- Upload PDF lên R2, dùng dữ liệu học sinh thật

## 7. Liên kết nhanh

| Tài liệu                                                                           | Vai trò                                    |
| ---------------------------------------------------------------------------------- | ------------------------------------------ |
| [`LESSON-STYLE-GUIDE.md`](./LESSON-STYLE-GUIDE.md)                                 | Cách viết từng mục                         |
| [`samples/SAMPLE-I1-toc-do-phan-ung.mdx`](./samples/SAMPLE-I1-toc-do-phan-ung.mdx) | Mẫu đã chốt                                |
| [`README.md`](./README.md)                                                         | Điểm vào nhanh cho thư mục `docs/content/` |
| [`../contracts/content.md`](../contracts/content.md)                               | Schema/QA/status đầy đủ, đã đóng băng      |
| `content/topics.ts`                                                                | Danh sách chuyên đề đã đăng ký             |
| `content/topics/chuyen-de-{NN}/*.mdx`                                              | Bài học thật                               |
| `AGENTS.md` / `CLAUDE.md`                                                          | Rule agent toàn repo, có pointer về đây    |

---

_Cập nhật khi Owner chốt thêm sample mới (vd. mục khác của CD08) — thêm liên kết vào §7, không
phá nguyên tắc ở §1._
