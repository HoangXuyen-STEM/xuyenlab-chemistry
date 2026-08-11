# Route wireframes v0.1

- Status: Draft for Phase 1; low-fidelity ASCII layout only. No visual design,
  no component library choice.
- Owner: Claude Code UX task (P1.3)
- Companion to `docs/ux-spec.md` (behavior, states, data) and
  `docs/design-tokens.md` (spacing/breakpoint/color tokens referenced below).
- Breakpoints used here: `bp-mobile` (<640px, single column), `bp-desktop`
  (≥1024px). `bp-tablet` (640–1024px) is a scaled version of the mobile layout
  with more horizontal padding and is not drawn separately.

Route inventory (v1 scope only; matches `KE_HOACH_XUYENLAB_CHEMISTRY.md` §1.3
and the authorization matrix in `docs/contracts/backend.md`):

| Route                                 | Auth                                                         | Wireframe below |
| ------------------------------------- | ------------------------------------------------------------ | --------------- |
| `/`                                   | anonymous → landing, authenticated → redirect to `/thu-vien` | §1              |
| `/dang-nhap`                          | anonymous                                                    | §2              |
| `/dang-ky`                            | anonymous                                                    | §2 (variant)    |
| `/quen-mat-khau`, `/dat-lai-mat-khau` | anonymous                                                    | §2 (variant)    |
| `/thu-vien`                           | student, teacher                                             | §3              |
| `/chuyen-de/[topic]`                  | student, teacher                                             | §4              |
| `/chuyen-de/[topic]/[lesson]`         | student, teacher                                             | §5              |
| `/tim-kiem`                           | student, teacher                                             | §6              |
| `/tien-do`                            | student                                                      | §7              |
| `/giao-vien`                          | teacher only                                                 | §8              |
| `/giao-vien/hoc-sinh/[id]`            | teacher only                                                 | §9              |
| `/khong-co-quyen`, not-found          | any                                                          | §10             |

---

## 1. `/` — Landing (anonymous)

```text
Mobile (<640px)                          Desktop (>=1024px)
+-----------------------------+          +--------------------------------------------------+
| [Logo] XuyenLab Chemistry    |          | [Logo] XuyenLab Chemistry        [Dang nhap] btn  |
+-----------------------------+          +--------------------------------------------------+
|                               |         |                                                    |
|  Hoc Hoa hoc chuyen sau       |         |        Hoc Hoa hoc chuyen sau cho doi tuyen HSG    |
|  cho doi tuyen HSG            |         |        26 chuyen de - Phan I: ly thuyet + vi du    |
|                               |         |                                                    |
|  26 chuyen de, ly thuyet +    |         |        [ Dang nhap de bat dau ]                    |
|  vi du co loi giai            |         |                                                    |
|                               |         +--------------------------------------------------+
|  [ Dang nhap de bat dau ]     |         | Footer: lien he giao vien | privacy                |
|                               |         +--------------------------------------------------+
+-----------------------------+
| Footer: lien he | privacy    |
+-----------------------------+
```

Notes: authenticated users never see this page body — the route redirects
server-side to `/thu-vien` before render (see `docs/ux-spec.md` §Flows,
"Session bootstrap"). No lesson content or private data appears here.

---

## 2. `/dang-nhap`, `/dang-ky`, `/quen-mat-khau`, `/dat-lai-mat-khau`

One shared centered-card layout at every breakpoint; only the form fields and
heading change. Drawn once for `/dang-nhap`.

```text
Mobile (<640px)                    Desktop (>=1024px) — same card, centered in viewport
+-----------------------------+    +--------------------------------------------------+
| [Logo]                       |   |                                                    |
+-----------------------------+    |              +----------------------+              |
|                               |   |              | [Logo]                |              |
|  Dang nhap                    |   |              | Dang nhap             |              |
|                               |   |              |                        |              |
|  [ (G) Dang nhap voi Google ] |   |              | [(G) Dang nhap Google] |              |
|  ---------- hoac ----------   |   |              | ---- hoac ----         |              |
|  Email    [______________]    |   |              | Email  [___________]  |              |
|  Mat khau [______________]    |   |              | Mat khau [_________]  |              |
|                                |   |              |                        |              |
|  [ Dang nhap ]                |   |              | [ Dang nhap ]          |              |
|                                |   |              |                        |              |
|  Quen mat khau?                |   |              | Quen mat khau? *      |              |
|  Chua co tai khoan? Dang ky    |   |              | Chua co tai khoan?    |              |
|                                |   |              +----------------------+              |
|  (!) banner: loi hien inline   |   |                                                    |
+-----------------------------+    +--------------------------------------------------+
```

State variants (same card shell, swap body):

- `/dang-ky`: adds "Ho ten hien thi" field; submit shows inline success panel
  "Kiem tra email de xac thuc" instead of navigating away.
- `/quen-mat-khau`: single email field + submit → inline confirmation panel.
- `/dat-lai-mat-khau`: reached only via emailed link (token in URL); shows new
  password + confirm fields. Invalid/expired token replaces the form with an
  inline error and a link back to `/quen-mat-khau`.
- Error banner slot (top of card body) renders `AppError.message` from
  `docs/contracts/backend.md` for `UNAUTHENTICATED`/`VALIDATION_FAILED`; never
  reveal whether an email exists in the system (generic copy only).

---

## 3. `/thu-vien` — Library (topic list)

```text
Mobile (<640px)                          Desktop (>=1024px)
+-----------------------------+          +--------------------------------------------------+
| [Logo]      [avatar v]       |          | [Logo]  Thu vien  Tien do  (Giao vien)  [avatar v]|
+-----------------------------+          +--------------------------------------------------+
| [ Tim kiem bai hoc...      ] |          | [ Tim kiem bai hoc...                    ] [Go]   |
+-----------------------------+          +--------------------------------------------------+
| Chuyen de 1: Cau tao NT   >   |         | +----------------+ +----------------+ +--------+ |
|   [====------] 40%            |         | | Chuyen de 1     | | Chuyen de 2     | | CD 3   | |
+-----------------------------+          | | [======--] 40%  | | [--------] 0%   | | 100%   | |
| Chuyen de 2: Bang tuan hoan >  |        | +----------------+ +----------------+ +--------+ |
|   [----------] 0%             |         | +----------------+ +----------------+ +--------+ |
+-----------------------------+          | | ...              grid continues 3-4 per row     | |
| ... (list continues, scroll) |          +--------------------------------------------------+
+-----------------------------+
```

Card content per topic: title, order number, lesson-count summary ("6/8 bai da
hoc"), aggregate progress bar. Empty state (no lessons published under a
topic yet) shows a muted "Sap ra mat" badge instead of a progress bar and the
card is not clickable. Loading state: skeleton cards (same grid, no text).

---

## 4. `/chuyen-de/[topic]` — Topic detail (lesson list)

```text
Mobile (<640px)                          Desktop (>=1024px)
+-----------------------------+          +--------------------------------------------------+
| < Thu vien                    |         | Thu vien > Chuyen de 1: Cau tao nguyen tu          |
+-----------------------------+          +--------------------------------------------------+
| Chuyen de 1                   |         | Chuyen de 1: Cau tao nguyen tu                    |
| Cau tao nguyen tu              |        | 6/8 bai da hoc  [==========------] 40%            |
| [======----] 40% (6/8 bai)    |         +--------------------------------------------------+
+-----------------------------+          | # | Bai hoc                | Thoi luong | T.thai  |
| 1. Thanh phan NT      [done]  |         | 1 | Thanh phan nguyen tu    | 15 phut    | Xong    |
| 2. Dong vi             [done] |         | 2 | Dong vi                 | 10 phut    | Xong    |
| 3. Cau hinh electron  [40%]   |         | 3 | Cau hinh electron       | 20 phut    | Dang hoc|
| 4. Bang tuan hoan     [ - ]   |         | 4 | Bang tuan hoan          | 18 phut    | Chua hoc|
| ... (scroll)                  |         | ... (rows continue)                              |
+-----------------------------+          +--------------------------------------------------+
```

Each row/card links to `/chuyen-de/[topic]/[lesson]`. Status derives from
`lesson_progress.status`/`read_percent` (`docs/contracts/backend.md`): "Chua
hoc" (no row), "Dang hoc N%" (`started`), "Xong" (`completed`). A lesson still
`draft`/`in_review` (never served to students per ADR-0002) simply does not
appear in this list.

---

## 5. `/chuyen-de/[topic]/[lesson]` — Lesson reader (core screen)

```text
Mobile (<640px)                                Desktop (>=1024px)
+-----------------------------+                +----------------------------------------------------------+
| < CD1   Bai 3/8   [PDF] [*]   |               | Thu vien > CD1 > Bai 3          [Bookmark] [Tai PDF] [v]  |
+-----------------------------+                +----------------------------------------------------------+
| [====------] 40% da doc       |               |                                        | Muc luc         |
+-----------------------------+                |  Cau hinh electron                     | -----------      |
| v Muc luc bai hoc (thu gon)   |               |  ================================      | > 1. Nguyen ly...|
+-----------------------------+                |                                        |   2. Vi du 1     |
|                               |               |  noi dung MDX...                      |   3. Vi du 2     |
|  Cau hinh electron            |               |  [DataTable]                          |   4. Cau hoi on..|
|  =========================    |               |                                        |                  |
|                               |               |  +--------------------------------+    | -----------      |
|  noi dung MDX (van ban,        |              |  | Vi du 1            [Example]    |    | [====----] 40%  |
|  cong thuc KaTeX, mhchem)      |              |  | De bai...                       |    | da doc          |
|                               |               |  | > Goi y (thu gon)                |    |                  |
|  [ChemFigure: hinh + caption]  |              |  | > Loi giai (thu gon)             |    | [ Da hoc xong ]  |
|                               |               |  +--------------------------------+    +------------------+
|  +-------------------------+  |               |                                        |
|  | Vi du 1        [Example] |  |              |  ... noi dung tiep tuc ...             |
|  | De bai...                |  |              |                                        |
|  | > Goi y (thu gon)        |  |              +----------------------------------------------------------+
|  | > Loi giai (thu gon)     |  |              | [<] Bai 2: Dong vi     Bai 4: Bang tuan hoan [>]           |
|  +-------------------------+  |              +----------------------------------------------------------+
|                               |
| [<] Bai truoc | Bai sau [>]   |
+-----------------------------+
| [ Da hoc xong ]               |
+-----------------------------+
```

Layout rule (`docs/design-tokens.md` breakpoints): below `bp-desktop` the TOC
is a collapsible accordion above the content, closed by default, remembers
open/closed only for the session (not persisted). At `bp-desktop` and above it
becomes a sticky right rail that also hosts the live read-progress bar and the
"Da hoc xong" button, so those controls stay reachable without scrolling back
to the top.

Key elements, all defined further in `docs/ux-spec.md`:

- Progress bar reflects `read_percent` computed from last-visible heading
  index / total headings (KE_HOACH §1.3), updated client-side as the reader
  scrolls and persisted via debounced `saveReadingPosition`.
- `[Bookmark]` toggles a bookmark at the nearest heading anchor
  (`createBookmark`/`deleteBookmark`).
- `[Tai PDF]` requests a short-lived signed URL (`getPdfDownload`) on click —
  never pre-fetched, never shown as a static link.
- Prev/next lesson nav uses `(topic, order)` sequence within the same topic;
  disabled/hidden at the first/last lesson of a topic (no cross-topic
  auto-advance in v1).
- `Example` / `Hint` / `Solution` map directly to the MDX components frozen in
  `docs/contracts/content.md`; `Hint` and `Solution` are collapsed by default
  on screen and force-expanded in print (`docs/design-tokens.md` §Print).

---

## 6. `/tim-kiem` — Search

```text
Mobile (<640px)                          Desktop (>=1024px)
+-----------------------------+          +--------------------------------------------------+
| < Thu vien                    |         | [ Tim kiem: "can bang hoa hoc"          ] [Go]    |
+-----------------------------+          +--------------------------------------------------+
| [ can bang hoa hoc     ] [Go]|          | 4 ket qua                                          |
+-----------------------------+          +--------------------------------------------------+
| 4 ket qua                     |         | CD7 > Can bang hoa hoc: nguyen ly chuyen dich...   |
+-----------------------------+          | tu khoa: can bang, Le Chatelier          [->]      |
| CD7 > Can bang hoa hoc         |        +--------------------------------------------------+
| nguyen ly chuyen dich...      |         | CD7 > Hang so can bang Kc, Kp                      |
| [->]                           |        | ...summary...                             [->]     |
+-----------------------------+          +--------------------------------------------------+
| ... (list continues)          |         | ... (list continues)                              |
+-----------------------------+          +--------------------------------------------------+
```

Matches on `title`/`summary`/`keywords` from published lesson metadata only
(KE_HOACH §1.3: full-text search is explicitly deferred). Empty query shows
recent/suggested topics instead of an empty result list. No-match state shows
"Khong tim thay ket qua cho '<query>'" plus a link back to `/thu-vien`.

---

## 7. `/tien-do` — Student dashboard

```text
Mobile (<640px)                          Desktop (>=1024px)
+-----------------------------+          +--------------------------------------------------+
| [Logo]      [avatar v]       |          | [Logo]  Thu vien  Tien do  [avatar v]              |
+-----------------------------+          +--------------------------------------------------+
| Tien do cua ban               |         | Tien do cua ban                                    |
| 12/26 chuyen de da bat dau    |         | Tong quan: 12/26 CD bat dau, 3 CD hoan thanh       |
+-----------------------------+          +--------------------------------------------------+
| Theo chuyen de:                |        | Theo chuyen de           | Bookmark cua ban        |
| CD1 [========--] 80%           |        | CD1 [========--] 80%      | * CD1>Bai3 "cau hinh.."|
| CD2 [--------] 0%              |        | CD2 [--------] 0%         | * CD7>Bai1 "Kc, Kp"    |
| ... (scroll)                   |        | CD3 [==========] 100%     | ... (scroll)            |
+-----------------------------+          | ... (scroll)               |                         |
| Bookmark cua ban               |        +--------------------------------------------------+
| * CD1 > Bai 3 "cau hinh.."     |
| * CD7 > Bai 1 "Kc, Kp"         |
+-----------------------------+
```

Each topic row and bookmark links back into the lesson reader at the saved
heading/anchor. Empty state (no progress yet): replace both panels with a
single prompt card "Chua co tien do — bat dau voi Chuyen de 1" linking to
`/thu-vien`.

---

## 8. `/giao-vien` — Teacher dashboard (class overview)

```text
Mobile (<640px)                          Desktop (>=1024px)
+-----------------------------+          +--------------------------------------------------------------+
| [Logo]      [avatar v]       |          | [Logo]  Thu vien  Giao vien  [avatar v]                        |
+-----------------------------+          +--------------------------------------------------------------+
| Danh sach hoc sinh (24)        |        | Danh sach hoc sinh (24)                    [ Tim hoc sinh...] |
+-----------------------------+          +--------------------------------------------------------------+
| Nguyen Van A                   |        | Ten            | CD hoan thanh | Bai gan nhat    | Cap nhat   |
| 5/26 CD * cap nhat 2h truoc >  |        | Nguyen Van A    | 2/26          | CD3 Bai2         | 2h truoc  |
+-----------------------------+          | Tran Thi B      | 8/26          | CD1 Bai5         | 1 ngay     |
| Tran Thi B                     |        | ... (rows, paginated)                                          |
| 8/26 CD * cap nhat 1 ngay >    |        +--------------------------------------------------------------+
+-----------------------------+          | [ < Trang 1/3 > ]                                              |
| ... (list, paginated)          |        +--------------------------------------------------------------+
+-----------------------------+
| [ < Trang 1/3 > ]              |
+-----------------------------+
```

Table is horizontally scrollable within its own container on narrow viewports
per `docs/design-tokens.md` layout rules — the page body itself never scrolls
horizontally. Row click navigates to `/giao-vien/hoc-sinh/[id]`. This screen
never renders `Other student's progress` outside the teacher-authorized
aggregate (`docs/contracts/backend.md` authorization matrix).

---

## 9. `/giao-vien/hoc-sinh/[id]` — Teacher: student detail

```text
Mobile (<640px)                          Desktop (>=1024px)
+-----------------------------+          +--------------------------------------------------+
| < Danh sach hoc sinh          |         | Giao vien > Danh sach hoc sinh > Nguyen Van A       |
+-----------------------------+          +--------------------------------------------------+
| Nguyen Van A                   |        | Nguyen Van A            5/26 CD hoan thanh         |
| 5/26 CD hoan thanh             |        +--------------------------------------------------+
+-----------------------------+          | Theo chuyen de           | Bookmark              |
| Theo chuyen de:                |        | CD1 [======--] 60%        | * CD1>Bai3            |
| CD1 [======--] 60%             |        | CD2 [----------] 0%       | * CD7>Bai1            |
| CD2 [----------] 0%            |        | ... (scroll)              | ... (scroll)          |
| ... (scroll)                   |        +--------------------------------------------------+
+-----------------------------+
| Bookmark:                      |
| * CD1 > Bai3                   |
+-----------------------------+
```

Read-only mirror of `/tien-do` scoped to one student via `getStudentDetail`;
no edit controls exist here (teacher cannot alter student progress in v1).

---

## 10. `/khong-co-quyen` and not-found

```text
Any breakpoint (centered, no app chrome except logo + logout)
+-----------------------------+
| [Logo]                       |
|                               |
|   (icon) Ban khong co quyen  |
|   truy cap trang nay          |
|                               |
|   [ Ve trang chu ]  [Dang xuat]|
+-----------------------------+
```

Used when: an authenticated non-teacher hits `/giao-vien*`, or an
authenticated email is not (yet) on `allowed_students`. Copy differs by cause
but the layout is shared. Next.js `not-found.tsx` reuses the same shell with
"Khong tim thay trang" copy and a single "Ve trang chu" action.
