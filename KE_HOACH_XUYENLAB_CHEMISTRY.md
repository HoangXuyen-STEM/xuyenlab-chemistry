# Kế hoạch khả thi triển khai XuyenLab Chemistry v1

> Cập nhật: 2026-08-10. Đây là kế hoạch thực thi cho một chủ dự án làm việc cùng Claude Code, GitHub Copilot và Codex. Tên model có thể thay đổi theo gói dịch vụ; ưu tiên alias/model tương đương được ghi trong mục 4.

## 1. Kết luận khả thi

### 1.1. Kết luận ngắn

- **Ứng dụng web:** khả thi cao. Next.js + Vercel + Neon + R2 đáp ứng tốt quy mô một giáo viên/một lớp.
- **Vertical slice gồm đăng nhập → đọc bài → lưu tiến độ → tải PDF:** khả thi sau khi cloud account, OAuth và secret được chủ dự án cấu hình.
- **Chuyển đủ 26 chuyên đề:** khả thi nhưng là phần tốn thời gian nhất. Không nên cam kết lịch cho toàn bộ nội dung trước khi hoàn thành conversion spike và hai pilot.
- **Ba AI cùng làm:** khả thi nếu làm theo phase và ownership theo file. Không cho ba agent cùng khởi tạo kiến trúc hoặc sửa chung `package.json`, schema và contracts.

### 1.2. Số liệu nguồn đã kiểm tra

| Hạng mục | Thực tế hiện có | Tác động |
|---|---:|---|
| Tệp nguồn | 47 `.docx` + 2 `.doc` | hai `.doc` cần LibreOffice hoặc chuyển thủ công |
| Dung lượng | khoảng 128 MB | không lớn về lưu trữ, nhưng phức tạp về định dạng |
| Media trong DOCX | khoảng 13.976 | cần deduplicate, tối ưu và lập manifest |
| Embedded objects | khoảng 14.175 | nhiều object có thể không chuyển được bằng thư viện DOCX thông thường |
| Word objects | khoảng 13.866 | phải có fallback thành ảnh hoặc biên tập LaTeX thủ công |
| OMML math | hơn 1.000 | cần kiểm thử chuyển OMML → MathML/LaTeX |
| HTML pilot | Chuyên đề 6 và 8 | có thể dùng làm baseline thay vì nhập lại từ đầu |
| Tool local | có Node/npm/unzip; chưa có LibreOffice/Pandoc | Phase 2 cần cài hoặc chạy converter trong container |
| Repository | thư mục `.git` hiện chưa được Git nhận diện là repository | phải hoàn tất Phase 0 trước khi chia branch/worktree |

Các con số trên bao gồm cả phần ngoài phạm vi v1, nhưng đủ để kết luận rằng “tự động chuyển hoàn hảo 49 file” không phải giả định khả thi. Mục tiêu đúng là **tạo draft tự động, báo lỗi đầy đủ và QA thủ công trước khi publish**.

### 1.3. Phạm vi v1 đã thu gọn

Trong v1:

- 26 chuyên đề, nhưng chỉ nội dung Phần I và ví dụ/bài mẫu có lời giải nằm trong Phần I;
- đăng nhập Google và email/mật khẩu;
- đọc bài, mục lục, bài trước/sau, bookmark, heading gần nhất và nút “Đã học xong”;
- dashboard cá nhân; dashboard giáo viên ở mức danh sách học sinh và tiến độ theo chuyên đề;
- PDF riêng tư theo bài;
- tìm kiếm theo tiêu đề, tóm tắt và từ khóa. Full-text search để sau khi nội dung ổn định.

Không thuộc v1: quiz/chấm điểm, giao bài, nhiều lớp, nhiều giáo viên, thảo luận, search engine riêng, phân tích hành vi nâng cao, tự động publish nội dung Word.

Để giảm độ giòn, “phần trăm đã đọc” được tính từ heading gần nhất/tổng heading của bài; không cố đồng bộ chính xác vị trí pixel giữa các thiết bị.

## 2. Kiến trúc v1

| Lớp | Lựa chọn | Giới hạn trách nhiệm |
|---|---|---|
| Web | Next.js + strict TypeScript trên Vercel | UI, server routes/actions, preview deploy |
| Content | MDX trong private GitHub repo | nguồn xuất bản chuẩn; Word chỉ là nguồn đối chiếu |
| Database | Neon Postgres + Drizzle migrations | profiles, progress, bookmarks, allowlist |
| Auth | Neon Auth qua `src/lib/auth` adapter | component không gọi SDK nhà cung cấp trực tiếp |
| Public assets | R2 `chem-assets` + `assets.xuyenlab.com` | ảnh tối ưu, tên content-hash, cache dài |
| Private files | R2 `chem-private` | PDF; signed URL TTL 60–300 giây sau server authorization |
| Delivery | GitHub Actions + Vercel Git integration | PR checks; production upload chỉ sau merge `main` |

Render/worker riêng chưa cần trong v1. Nếu GitHub Actions không đáp ứng thời gian tạo PDF theo batch thì mới đánh giá Render hoặc một worker riêng.

## 3. Contracts phải đóng băng trước khi làm song song

### 3.1. Repository

```text
content/topics/<topic-slug>/<lesson-slug>.mdx
content/topics.ts
content/qa/<lesson-slug>.json
src/app/
src/components/mdx/
src/features/{content,progress,bookmarks,teacher}/
src/lib/{auth,db,r2,validation}/
db/migrations/
scripts/{inventory,import-docx,validate-content,generate-pdf}/
docs/{adr,contracts,runbook}/
.github/workflows/
```

### 3.2. Content contract

Mỗi bài bắt buộc có: `topic`, `title`, `slug`, `order`, `summary`, `keywords`, `estimatedMinutes`, `sourceFiles`, `version`, `status`. `slug` là định danh bất biến; `status` chỉ nhận `draft | in_review | published`.

Validator phải chặn: metadata thiếu, slug/order trùng, topic không tồn tại, link/asset hỏng, MDX không biên dịch được và bài `published` thiếu QA record.

### 3.3. Data contract

- `profiles(user_id PK, display_name, role, joined_at)`;
- `allowed_students(email PK, invited_at, verified_at)`;
- `lesson_progress(user_id, lesson_slug, status, last_heading, read_percent, started_at, updated_at, completed_at)`, PK `(user_id, lesson_slug)`;
- `bookmarks(id, user_id, lesson_slug, anchor, label, created_at)`.

Mọi mutation xác thực ở server. Student chỉ đọc/sửa dữ liệu của mình; teacher đọc báo cáo lớp. `TEACHER_EMAILS` chỉ được đánh giá server-side. Nếu dùng credential theo user thì bật RLS; nếu server giữ DB credential thì mọi query vẫn phải lọc owner/role và có integration test chống truy cập chéo.

## 4. Cách dùng model

Không dùng model mạnh nhất cho mọi việc. Model tạo code không được tự quyết publish nội dung Hóa học hay thay đổi production secrets.

| Công cụ | Model/chế độ mặc định | Dùng cho | Nâng cấp khi |
|---|---|---|---|
| Codex | GPT-5.6 Terra, `medium/high` | implementation, conversion scripts, integration, test | dùng GPT-5.6 Sol `high/xhigh` cho kiến trúc, lỗi khó, auth/security và quyết định go/no-go |
| Codex | GPT-5.6 Luna, `low/medium` | kiểm kê, metadata, tác vụ lặp có validator | không dùng để quyết định correctness hóa học |
| Claude Code | `opusplan` hoặc Opus để lập kế hoạch, Sonnet để thi công | UX, MDX components, responsive/print CSS, refactor nhiều file | dùng Opus cho layout/architecture khó; Sonnet cho feature hằng ngày |
| Claude Code | Haiku | sửa nhỏ, docs, đổi tên cơ học | chỉ khi test/validator bao phủ rõ |
| GitHub Copilot agent/CLI | GPT-5.3-Codex | issue có phạm vi rõ, test, API/backend và CI | dùng GPT-5.4 cho deep debugging, schema/security review |
| GitHub Copilot | Auto hoặc Claude Haiku 4.5 | completion, boilerplate, test cases lặp | pin model mạnh hơn nếu task thất bại hai lần |

Nếu model trên không có trong subscription, dùng model cùng nhóm năng lực: **frontier/deep reasoning** cho thiết kế và review; **balanced coding** cho feature; **fast/mini** cho việc cơ học đã có test. Không đổi model giữa một task chỉ vì một lỗi test; trước hết cung cấp log và contract đầy đủ.

## 5. Kế hoạch theo phase

Thời lượng dưới đây là ước lượng effort, không phải cam kết lịch. Phase 6 chỉ được ước lượng lại sau pilot vì phụ thuộc QA nội dung của con người.

### Bảng điều phối nhanh

| Phase | Điều phối và phân công | Chỉ bắt đầu khi | Tài liệu bàn giao bắt buộc |
|---|---|---|---|
| P0 — Chốt nền tảng | **Codex Sol:** inventory, ADR, contracts; **Chủ dự án:** repo/cloud/OAuth | bắt đầu dự án | `docs/handoffs/P0/SUMMARY.md`, `docs/adr/*`, `docs/contracts/*` |
| P1 — App foundation | **Codex Terra:** Next.js/test skeleton; **Copilot GPT-5.3-Codex:** CI; **Claude `opusplan`:** UX spec | P0 được duyệt | handoff từng task + `docs/handoffs/P1/SUMMARY.md`, `docs/ux-spec.md` |
| P2 — Conversion spike | **Codex Sol:** converter prototype; **Claude Sonnet:** MDX renderer; **Copilot GPT-5.4:** regression tests; **Chủ dự án:** đối chiếu mẫu | P1 CI xanh | handoff từng task + `docs/handoffs/P2/SUMMARY.md`, `docs/conversion-report.md` |
| P3 — Vertical slice | **Copilot GPT-5.3-Codex:** DB/auth/progress; **Claude Sonnet:** UI; **Codex Sol/Terra:** R2, PDF API, integration/security | P2 có quyết định A/B/C | handoff từng task + `docs/handoffs/P3/SUMMARY.md`, cập nhật `docs/contracts/*` |
| P4 — Pilot 6 và 8 | **Codex:** importer/validator/assets; **Claude Sonnet:** UI/print polish; **Copilot:** E2E/content tests; **Chủ dự án:** QA hóa học | P3 E2E xanh | handoff từng task + `docs/handoffs/P4/SUMMARY.md`, `content/qa/*`, `docs/pilot-metrics.md` |
| P5 — Release pipeline | **Copilot:** PDF/CI/R2 upload; **Claude Sonnet:** dashboard/search; **Codex Sol:** security/release review | P4 được publish ở staging | handoff từng task + `docs/handoffs/P5/SUMMARY.md`, `docs/runbook.md` |
| P6 — Content batches | **Codex:** draft/import/integrate; **Claude:** sửa MDX/component; **Copilot:** regression tests; **Chủ dự án:** QA/publish | P5 staging ổn định | `docs/handoffs/P6-B<N>/*.md`, `docs/handoffs/P6-B<N>/SUMMARY.md`, `content/qa/*`, metrics |
| P7 — Launch | **Claude:** UX fixes; **Copilot GPT-5.4:** bug fixes; **Codex Sol:** release owner; **Chủ dự án:** DNS/account/launch approval | mọi bài định phát hành đạt QA | handoff từng task + `docs/handoffs/P7/SUMMARY.md`, cập nhật `docs/runbook.md` |

### Quy tắc handoff bắt buộc

- **Mỗi agent** phải tạo `docs/handoffs/P<N>/<task-id>-<agent>.md` trước khi kết thúc phần việc của mình. Không chỉ ghi trong chat của model.
- Integration owner đọc các handoff task, chạy kiểm tra tích hợp và viết `docs/handoffs/P<N>/SUMMARY.md`. Phase chỉ hoàn tất khi `SUMMARY.md` được chủ dự án hoặc reviewer được chỉ định duyệt.
- Mỗi agent phải đọc plan, contracts và handoff của phase trước khi sửa code. Trong PR/task summary, agent xác nhận các file đã đọc.
- Handoff chỉ được xem là hoàn tất khi lệnh kiểm thử ghi trong tài liệu chạy xanh và integration owner review.
- Nếu implementation khác plan, agent không tự sửa định hướng âm thầm: ghi mục `Sai lệch so với plan`, lý do, ảnh hưởng và quyết định cần duyệt; sau khi duyệt mới cập nhật plan/ADR/contracts.
- Phase sau không dựa vào trí nhớ hội thoại. Nguồn chuẩn theo thứ tự: code/migrations → contracts/ADR → handoff đã duyệt → plan.

Mẫu tối thiểu cho handoff của từng agent:

```md
# Handoff <task-id> — <Agent/model>

## Trạng thái
Complete | Partial | Blocked

## Đã hoàn thành
- Task/issue và kết quả có thể kiểm chứng.

## Quyết định và giả định
- Quyết định đã chốt, ADR/contract liên quan.

## Files và migrations đã thay đổi
- Đường dẫn và mục đích; migration nào đã chạy ở môi trường nào.

## Cách kiểm tra
- Lệnh setup/test/build và kết quả cuối.

## Environment và dịch vụ ngoài
- Chỉ ghi tên biến/config; tuyệt đối không ghi giá trị secret.

## Việc còn lại, lỗi biết trước và rủi ro
- Owner đề xuất và mức ưu tiên.

## Sai lệch so với plan
- Không có, hoặc mô tả thay đổi đã được duyệt.

## Đầu vào bắt buộc cho phase tiếp theo
- Contract, fixture, account/config và điều kiện cần có.
```

### Phase 0 — Khởi tạo và chốt quyết định (0,5–1 ngày)

**Mục tiêu:** tạo nền cộng tác an toàn trước khi agent viết feature.

| ID | Owner/model | Công việc | Bàn giao |
|---|---|---|---|
| P0.1 | Codex Sol `high` | kiểm kê nguồn, ghi ADR kiến trúc, chốt scope và contracts | `docs/adr/*`, `docs/contracts/*`, source inventory |
| P0.2 | Chủ dự án | tạo private repo, Neon/Vercel/R2 dev, Google OAuth; xác nhận domain | account/project IDs, chưa chia sẻ production secret |
| P0.3 | Codex Terra | khởi tạo Git, branch protection guidance, `.gitignore`, secret policy, task labels | repo có commit đầu tiên và issue template |

**Exit gate:** repo hợp lệ; scope/contract được duyệt; biết rõ dev resources nào đã có. Không cho Claude/Copilot cùng bootstrap repo trước gate này.

### Phase 1 — Foundation build được (1–2 ngày)

**Mục tiêu:** `main` luôn build được và các agent có ranh giới file rõ.

| ID | Owner/model | Phạm vi | Không sửa |
|---|---|---|---|
| P1.1 | Codex Terra `high` | Next.js strict TS, package manager lock, env schema, test runners, folder skeleton | cloud production |
| P1.2 | Copilot GPT-5.3-Codex | CI lint/typecheck/unit/build và dependency cache sau P1.1 | app architecture, DB schema |
| P1.3 | Claude Code `opusplan` | UX specification, route wireframes, design tokens ở docs | implementation dùng chung trước khi P1.1 merge |

**Exit gate:** một lệnh setup, một lệnh test; PR check xanh; Vercel preview chạy với trang fixture. Chỉ sau P1.1 merge mới tạo branch/worktree cho P1.2 và P1.3.

### Phase 2 — Conversion spike và quyết định go/no-go (2–4 ngày)

**Mục tiêu:** chứng minh chiến lược Word → MDX trên mẫu khó, chưa xây full pipeline.

| ID | Owner/model | Công việc | Bàn giao |
|---|---|---|---|
| P2.1 | Codex Sol `high` | dựng container/toolchain LibreOffice; thử trích DOCX, OMML, bảng, media, embedded objects trên chuyên đề 6 và 8 | báo cáo fidelity + prototype importer |
| P2.2 | Claude Code Sonnet | renderer cho một fixture từ HTML/MDX: KaTeX/mhchem, table, figure, example block | một lesson responsive và print preview |
| P2.3 | Copilot GPT-5.4 | viết fixture-based tests và failure report schema cho converter | regression corpus + test cases |
| P2.4 | Chủ dự án + Codex | đối chiếu 10–20 trang mẫu với Word/HTML gốc | quyết định phương án A/B/C |

Ba phương án sau spike:

- **A — semantic:** text/table/formula chuyển sang MDX/LaTeX; chỉ object lỗi thành ảnh. Tốt nhất nhưng QA lâu.
- **B — hybrid (mặc định):** text và heading thành MDX; công thức/object phức tạp giữ dạng ảnh tối ưu có alt/caption. Khả thi nhất cho v1.
- **C — image-first:** dùng ảnh theo trang/khối cho tài liệu quá khó. Chỉ dùng ngoại lệ vì accessibility/search kém.

**Exit gate:** ít nhất 95% khối trong mẫu có đầu ra nhìn được; 100% khối thất bại xuất hiện trong QA report; importer chạy lặp không phá dữ liệu đã biên tập. Nếu không đạt, thu hẹp pilot hoặc dùng phương án B/C, không mở rộng toàn bộ 26 chuyên đề.

### Phase 3 — Vertical slice kỹ thuật (4–7 ngày)

**Mục tiêu:** một học sinh thật có thể đăng nhập, đọc một bài fixture, lưu tiến độ/bookmark và tải một PDF test.

Sau khi Codex merge contracts, ba nhánh có thể chạy song song:

| ID | Owner/model | Ownership | Kết quả |
|---|---|---|---|
| P3.1 | Copilot GPT-5.3-Codex; GPT-5.4 review | `db/`, `src/lib/auth`, `src/lib/db`, backend progress/bookmark | migrations, Neon Auth adapter, authorization tests |
| P3.2 | Claude Code Sonnet; Opus review | `src/app`, `src/components`, client UI | thư viện, bài học, tiến độ, auth screens, responsive states |
| P3.3 | Codex Terra; Sol security review | `src/lib/r2`, server PDF endpoint, integration glue | signed URL test, error handling, full vertical E2E |

**Exit gate:** anonymous bị chặn; student không đọc được dữ liệu user khác; teacher guard chạy ở server; progress phục hồi sau đăng nhập lại; PDF test chỉ tải được qua signed URL. Mọi integration conflict do Codex xử lý trên branch riêng, không để agent force-push branch của nhau.

### Phase 4 — Pilot nội dung 6 và 8 (5–10 ngày, phụ thuộc QA người)

**Mục tiêu:** hai chuyên đề thật đi hết quy trình `source → draft → review → published → PDF`.

| ID | Owner/model | Công việc |
|---|---|---|
| P4.1 | Codex Terra/Sol | hoàn thiện importer, asset hashing, QA report và content validator từ kết quả spike |
| P4.2 | Claude Code Sonnet | polish MDX components, mobile/desktop/print CSS bằng nội dung thật |
| P4.3 | Copilot GPT-5.3-Codex | test link/asset/metadata, accessibility cơ bản và Playwright flows |
| P4.4 | Chủ dự án | đối chiếu hóa học, phạm vi Phần I, thuật ngữ, công thức, đáp án và quyết định `published` |

**Exit gate:** mọi bài pilot có `sourceFiles`, QA record, không có lỗi converter chưa xử lý, PDF A4 không cắt nội dung quan trọng. Ghi lại số giờ draft và QA để ước lượng Phase 6.

### Phase 5 — Release pipeline và dashboard tối thiểu (3–5 ngày)

| ID | Owner/model | Công việc | Điều kiện nghiệm thu |
|---|---|---|---|
| P5.1 | Copilot GPT-5.3-Codex | PDF theo content hash; CI content/link/asset check; upload R2 sau merge | dry-run trên preview, production secret không lộ |
| P5.2 | Claude Code Sonnet | `/tien-do`, `/giao-vien`, search metadata, loading/error/empty states | dùng được trên mobile, không truy vấn N+1 rõ rệt |
| P5.3 | Codex Sol `high` | integration/security review, rate/error handling, backup/rollback runbook | threat checklist và E2E production-like xanh |

**Exit gate:** pilot được deploy ở staging; teacher/student test bằng account riêng; rollback và regenerate PDF đã được diễn tập.

### Phase 6 — Mở rộng nội dung theo batch (ước lượng sau pilot)

Không chia đều theo số chuyên đề. Xếp batch sơ bộ theo số media + embedded object đo được; sau manifest chỉ giữ file/Phần I đúng phạm vi và xếp lại.

| Batch | Chuyên đề sơ bộ | Lý do |
|---|---|---|
| B1 — thấp | 24, 2, 12, 20, 16, 15, 23, 25 | ít object hơn; dùng để tăng throughput sau pilot |
| B2 — vừa | 19, 22, 17, 10, 13, 3 | kiểm chứng pipeline trên nội dung đa dạng |
| B3 — cao | 14, 11, 5, 7, 1, 4, 18, 21, 9 | nhiều media/object; cần ngân sách QA lớn hơn |
| B4 — ngoại lệ | 26 và mọi file `.doc`/OLE lỗi | legacy format hoặc độ phức tạp chưa đo được |

Mỗi batch dùng cùng luồng:

1. Codex Luna/Terra chạy inventory/import/validator và tạo draft + failure queue.
2. Claude Code Haiku/Sonnet thực hiện sửa MDX cơ học hoặc component gap có test; không tự sửa kết luận hóa học.
3. Copilot GPT-5.3-Codex bổ sung regression test khi gặp pattern lỗi mới.
4. Chủ dự án QA nội dung và publish từng bài, không chờ cả batch.
5. Codex tích hợp, tạo PDF và ghi metrics throughput.

**Exit gate từng bài:** validator xanh, QA hóa học được ký, trace về source, asset đầy đủ, web/mobile/print đạt. Nếu pilot cho thấy tốc độ dưới 1 chuyên đề/tuần, phải giảm phạm vi hoặc bổ sung người biên tập; không giải quyết bằng cách bỏ QA.

### Phase 7 — UAT và production launch (2–3 ngày kỹ thuật)

| Owner | Công việc |
|---|---|
| Chủ dự án | cấp account cho nhóm nhỏ, duyệt DNS, privacy copy và thời điểm mở lớp |
| Claude Code Sonnet | sửa UX/accessibility từ UAT |
| Copilot GPT-5.4 | tái hiện và sửa bug có issue/test rõ ràng |
| Codex Sol | release owner: migrations, env audit, R2 permissions, monitoring, rollback |

**Exit gate:** HTTPS/DNS đúng; preview không chạm production; anonymous/student/teacher permissions được retest; backup/rollback đã xác minh; không còn lỗi nghiêm trọng.

## 6. Quy tắc cộng tác để tránh xung đột

- Codex là **integration owner** và giữ contracts; Claude Code sở hữu UI/MDX presentation; Copilot sở hữu issue backend/test/CI được giao rõ.
- Một task tương ứng một issue, một branch/worktree, một owner và một Definition of Done.
- Agent đọc plan, contract và file ownership trước khi sửa; không sửa file ngoài scope nếu chưa ghi lý do trong PR.
- Không chạy song song các task cùng sửa `package.json`, lockfile, migration sequence, auth adapter hoặc workflow production.
- PR nhỏ, CI xanh, có test cho bug; agent khác review khi task liên quan auth, migration, upload hoặc PDF authorization.
- AI chỉ tạo `draft`/`in_review`; chỉ chủ dự án được duyệt nội dung Hóa học thành `published`.
- Không đưa production token vào prompt, repo, log hoặc preview environment.

## 7. Tiêu chí nghiệm thu v1

- Anonymous không mở được bài, progress, dashboard hoặc PDF.
- Student chỉ xem/sửa dữ liệu của mình; student không vào được `/giao-vien`; teacher xem được báo cáo lớp.
- Google/email login, logout và reset password hoạt động; email ngoài allowlist bị xử lý đúng chính sách.
- Heading/progress, complete và bookmark được phục hồi trên thiết bị khác.
- Mỗi bài `published` có metadata, QA record, trace về Word, asset/link hợp lệ và PDF riêng tư.
- Công thức, bảng và hình dùng được trên mobile, desktop và bản in; lỗi chuyển đổi không bị bỏ qua âm thầm.
- Preview/dev/prod tách dữ liệu và secrets; CI, deploy, regenerate PDF và rollback có runbook.

## 8. Dự báo effort thực tế

- Phần nền tảng kỹ thuật đến staging pilot: khoảng **12–20 ngày công**, tương đương khoảng **3–5 tuần lịch** khi một người điều phối ba agent và còn phải review/QA; giả định tài khoản cloud và cấu hình OAuth không bị chặn.
- Phần 26 chuyên đề: chưa nên chốt lịch. Baseline thận trọng cho một người QA là **8–16 tuần hoặc hơn**, phụ thuộc tỷ lệ object phải sửa thủ công và độ dài thực tế của Phần I.
- Sau hai pilot, dùng công thức: `effort còn lại = số khối/bài còn lại × thời gian trung vị mỗi khối/bài`, cộng 25–40% dự phòng cho các chuyên đề phức tạp và legacy `.doc`.

Điều kiện để plan tiếp tục khả thi là giữ scope v1, đo throughput sau pilot và coi QA hóa học của con người là gate bắt buộc.

## 9. Tài liệu tham chiếu cho lựa chọn model

- Claude Code model aliases: <https://code.claude.com/docs/en/model-config>
- GitHub Copilot model comparison: <https://docs.github.com/en/copilot/reference/ai-models/model-comparison>
- OpenAI model guidance: <https://developers.openai.com/api/docs/guides/latest-model>
