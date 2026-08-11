# UX specification v0.1 — XuyenLab Chemistry v1

- Status: Draft for Phase 1; documentation only. No shared implementation
  changes in this task (P1.3). A bounded implementation task (P3, per
  `KE_HOACH_XUYENLAB_CHEMISTRY.md` §5) turns this into code.
- Owner: Claude Code UX task (P1.3)
- Inputs read: `KE_HOACH_XUYENLAB_CHEMISTRY.md`, `AGENTS.md`,
  `docs/adr/0001-platform-architecture.md`, `docs/adr/0002-content-lifecycle.md`,
  `docs/adr/0003-auth-and-data-access.md`, `docs/contracts/content.md`,
  `docs/contracts/backend.md`, `docs/contracts/storage-and-environment.md`,
  `docs/contracts/handoff.md`, `docs/handoffs/P1/P1.1-codex.md`,
  `docs/handoffs/P1/P1.2-copilot.md`.
- Companions: `docs/wireframes.md` (route-by-route layout),
  `docs/design-tokens.md` (color/type/spacing/breakpoint/print values).
- This document specifies **behavior and states**, not visual design or a
  component library choice. It does not add, rename or contradict anything in
  `docs/contracts/*.md`; where this spec needs backend behavior not yet in
  `docs/contracts/backend.md`, it says so explicitly under "Open questions"
  rather than inventing a contract change.

## 1. Product frame

One teacher, one class. Every screen answers one of: "get me to a lesson",
"help me pick up where I left off", or "let the teacher see who's behind" — per
KE_HOACH §1.3 scope. Anything not in that scope (quiz/grading, assignments,
multi-class, discussion, full-text search, auto-publish) is explicitly **not**
designed here; see §7 Non-goals.

Design priorities, in order:

1. **Never leak another student's data.** Every screen spec below states what
   an anonymous user, the owning student, another student and the teacher each
   see — mirroring the authorization matrix in `docs/contracts/backend.md`.
2. **Read on a phone, print on A4.** The lesson reader is the product; the
   dashboards exist to route people back into it.
3. **Never silently hide a conversion or QA failure.** Draft/in-review lessons
   never render to students; QA `blocking` issues never publish (ADR-0002).
4. **Degrade honestly.** Every data-bearing screen has an explicit loading,
   empty and error state below — no screen may assume the happy path.

## 2. Information architecture

```text
/                             landing (anonymous) / redirect (authenticated)
/dang-nhap                    login
/dang-ky                      register
/quen-mat-khau                request password reset
/dat-lai-mat-khau             set new password (emailed token)
/thu-vien                     library: all topics, entry point after login
/chuyen-de/[topic]            topic detail: ordered lesson list
/chuyen-de/[topic]/[lesson]   lesson reader
/tim-kiem                     search (title/summary/keyword)
/tien-do                      student's own dashboard
/giao-vien                    teacher: class overview
/giao-vien/hoc-sinh/[id]      teacher: one student's detail
/khong-co-quyen               403 shell (role/allowlist denial)
```

Route → wireframe → auth requirement mapping lives in the table at the top of
`docs/wireframes.md`; it is not repeated here to avoid the two documents
drifting apart.

Primary nav (persistent, visible to authenticated users only): Thu vien,
Tien do, Giao vien (teacher role only), account menu (avatar → display name,
logout). No nav item ever renders for a role that cannot use it — role is
resolved server-side before the nav renders, not hidden via CSS.

## 3. Core user flows

### 3.1 Session bootstrap (every route)

1. Server resolves `getSession()` (`docs/contracts/backend.md`).
2. No session + protected route → redirect to `/dang-nhap?next=<path>`.
3. No session + `/` → render landing.
4. Session but email not in `allowed_students` and not teacher-flagged →
   `/khong-co-quyen` with "chưa được cấp quyền" copy. This state must be
   reachable even though it is not in `docs/contracts/backend.md`'s matrix
   verbatim; flag under §8 Open questions for the backend task to confirm the
   exact signal (e.g. a `FORBIDDEN` error code vs. a session claim).
5. Session + `/` or `/dang-nhap`/`/dang-ky` → redirect to `/thu-vien`
   (or `?next`).
6. Session + `/giao-vien*` with role `student` → `/khong-co-quyen`.

### 3.2 Login → first lesson

Login (Google or email/password) → `/thu-vien` → tap a topic card →
`/chuyen-de/[topic]` → tap first not-yet-completed lesson →
`/chuyen-de/[topic]/[lesson]`. Every step must be reachable with only a
pointer/tap and, separately, only a keyboard (see §6 Accessibility).

### 3.3 Reading progress ("percent read")

Per KE_HOACH §1.3, progress is **heading-index based**, not scroll-pixel
based, specifically to avoid device-to-device drift:

1. The reader observes which top-level heading is nearest the top of the
   viewport (e.g. `IntersectionObserver` on heading anchors — an
   implementation detail, not frozen here).
2. `read_percent = round(100 * currentHeadingIndex / totalHeadings)`.
3. Changes are debounced (proposed: 3–5s idle, or on route leave/tab hidden)
   and sent via `saveReadingPosition(lessonSlug, lastHeading, readPercent)`.
4. Returning to a lesson scrolls to `last_heading` and restores the progress
   bar from the last persisted value — not from local client state — so
   progress is correct after switching devices.
5. `read_percent` reaching 100 does **not** by itself set `status: completed`.
   Completion is an explicit, separate action (§3.4) — a student may skim to
   the end without marking a lesson done, and the UI must not silently mark it
   for them.

### 3.4 Marking a lesson complete

"Đã học xong" is a deliberate, always-visible action (not auto-triggered by
scroll position). On click: optimistic UI update → `markLessonComplete` →
on success, button becomes a disabled/checked "Đã hoàn thành" state; on
failure, revert and show an inline error using the `AppError` envelope
(`docs/contracts/backend.md`). The action is idempotent — clicking an already
completed lesson's button again is a no-op, not an error.

### 3.5 Bookmarking

Bookmark toggle targets the nearest heading anchor the reader is currently at
(same anchor computation as §3.3). One click creates a bookmark at that
anchor; a second click on an already-bookmarked anchor deletes it. Multiple
bookmarks per lesson at different anchors are allowed (`bookmarks` table is
keyed by `(user_id, lesson_slug, anchor)`, not one-per-lesson). No modal for
the common case; an optional "label" field is available but never required to
save a bookmark (matches `createBookmark`'s optional `label`).

### 3.6 PDF download

"Tải PDF" never renders a static `href` to a PDF. On click: show a loading
state on the button → call `getPdfDownload(lessonSlug)` → open the returned
signed URL in a new tab (or trigger a download) → if the click-to-open gap
exceeds the signed URL's 60–300s TTL (`docs/contracts/storage-and-environment.md`),
treat the resulting fetch failure as expired and prompt the user to click
"Tải PDF" again rather than showing a raw provider error. The button is
disabled (not hidden) for lessons that are not `published` yet, with a tooltip
"PDF sẽ có sau khi bài học xuất bản".

### 3.7 Teacher review

Teacher never edits a student's progress. `/giao-vien` is read-only; the only
interaction is search/filter/paginate the class list and drill into
`/giao-vien/hoc-sinh/[id]`. There is no "message student" or "reset progress"
action in v1 — adding one would be scope creep beyond KE_HOACH §1.3.

## 4. Page-by-page state matrix

Every route below must implement all four states; "—" means the state cannot
occur for that route.

| Route                                                           | Loading                                           | Empty                                                                                     | Error                                                                                                                                                            | Notes                                                                      |
| --------------------------------------------------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `/thu-vien`                                                     | Skeleton topic cards                              | — (26 topics always exist once seeded)                                                    | Inline retry banner, cards area stays mounted                                                                                                                    | Topics with zero published lessons show a "Sắp ra mắt" badge, not an error |
| `/chuyen-de/[topic]`                                            | Skeleton lesson rows                              | Topic exists but 0 published lessons → "Chưa có bài học nào"                              | 404 if `topic` slug doesn't exist; inline retry on transient fetch failure                                                                                       |                                                                            |
| `/chuyen-de/[topic]/[lesson]`                                   | Skeleton prose + TOC placeholder                  | —                                                                                         | 404 if lesson not `published` (student) or slug unknown; inline error banner for a failed `saveReadingPosition`/`markLessonComplete` that does not block reading | A failed progress save must never block the reader from continuing to read |
| `/tim-kiem`                                                     | Skeleton result rows                              | Empty query → suggested topics; query with 0 matches → "Không tìm thấy kết quả cho '…'"   | Inline retry banner                                                                                                                                              | Client-side filter over published metadata; see §7                         |
| `/tien-do`                                                      | Skeleton stat + list                              | No progress yet → single prompt card linking to `/thu-vien` (see `docs/wireframes.md` §7) | Inline retry banner                                                                                                                                              |                                                                            |
| `/giao-vien`                                                    | Skeleton table rows                               | 0 students on allowlist → "Chưa có học sinh nào được cấp quyền"                           | Inline retry banner, pagination controls disabled while erroring                                                                                                 |                                                                            |
| `/giao-vien/hoc-sinh/[id]`                                      | Skeleton detail panel                             | Student has no progress yet → "Học sinh chưa bắt đầu"                                     | 404 if `id` doesn't resolve to an allowlisted student                                                                                                            |                                                                            |
| `/dang-nhap`, `/dang-ky`, `/quen-mat-khau`, `/dat-lai-mat-khau` | Submit button shows spinner; fields stay editable | —                                                                                         | Inline banner in the card (`docs/wireframes.md` §2); never reveal whether an email exists                                                                        |                                                                            |

Loading states never block the whole page behind a full-screen spinner except
on first paint of `/dang-nhap`/`/dang-ky` submission; every other route shows
its chrome (nav, headings) immediately and skeletons only the data-dependent
regions.

## 5. MDX component behavior (lesson reader)

These map 1:1 to the components frozen in `docs/contracts/content.md`; this
section adds on-screen/print behavior only, it does not change their props.

| Component    | Screen behavior                                                                                                 | Print behavior                                                            |
| ------------ | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `Example`    | Card with title, groups `Hint`/`Solution` children                                                              | Same card, no interaction affordances                                     |
| `Hint`       | Collapsed by default, click to expand, keyboard-operable (`<button aria-expanded>`)                             | Force-expanded (`docs/design-tokens.md` §Print)                           |
| `Solution`   | Collapsed by default, same pattern as `Hint`                                                                    | Force-expanded                                                            |
| `ChemFigure` | Responsive image, caption below, click to view full-size (lightbox optional, not required for v1)               | Fits print content width, `break-inside: avoid`, caption retained         |
| `DataTable`  | Horizontally scrollable within its own container on narrow screens, sticky header on scroll within long tables  | Header row repeats on page break, no horizontal scroll (must fit or wrap) |
| `Callout`    | `type` drives icon + `color-warning`/`color-danger`/`color-brand`-subtle background per `docs/design-tokens.md` | Grayscale-safe per print color-mode rule                                  |

KaTeX math and `mhchem` chemical notation render inline and in display mode;
neither has an interactive state to specify here — rendering correctness is a
content-pipeline concern (ADR-0002, Phase 2), not a UX concern.

## 6. Accessibility

- Keyboard: every action reachable by click (bookmark, complete, PDF
  download, TOC toggle, Hint/Solution expand, pagination, search) must also be
  reachable and operable via keyboard, with a visible focus ring
  (`color-focus-ring`, `border-width-focus` from `docs/design-tokens.md`).
- Landmarks: one `<main>` per route; the TOC rail and primary nav are
  `<nav>` landmarks with distinct `aria-label`s so screen reader users can
  jump between them.
- Headings: lesson content heading levels are semantic and sequential (the
  TOC and the progress calculation in §3.3 both depend on real heading
  elements, not styled `<div>`s).
- Images: `ChemFigure` `alt` is mandatory per `docs/contracts/content.md`;
  purely decorative UI icons use `aria-hidden`.
- Color: no state (error, warning, success, completion) is conveyed by color
  alone — always pair with text or an icon + text (e.g. "Xong" label, not just
  a green dot).
- Motion: respect `prefers-reduced-motion` per `docs/design-tokens.md` §Motion.
- Forms: every input has a visible label (not placeholder-only); validation
  errors are associated to their field (`aria-describedby`) and also announced
  as a page-level summary for screen readers when a submit fails.

## 7. Non-goals (v1)

Restating KE_HOACH §1.3 explicitly so implementers don't accidentally design
for them: quiz/auto-grading, assignment/homework distribution, multiple
classes or teachers, discussion/comments, a dedicated search engine or
full-text search, behavioral analytics, automatic Word→publish. `/tim-kiem`
is a client-side filter over already-published lesson metadata
(`title`/`summary`/`keywords`), not a search index.

## 8. Open questions for later phases

These need a decision from the backend/integration owner before or during
Phase 3; none are answered here because they would mean inventing a contract
change outside this task's scope:

1. Exact signal for "authenticated but not on `allowed_students`" — a
   dedicated `FORBIDDEN` reason code, a session claim, or a server-side
   redirect decided outside the documented operations list. Affects
   `/khong-co-quyen` copy variants (§3.1 step 4).
2. Debounce interval and flush triggers for `saveReadingPosition` (§3.3
   proposes 3–5s idle + route-leave/tab-hidden as a starting point, not a
   frozen value).
3. Whether `/tim-kiem` matching is prefix, substring or token-based, and
   whether Vietnamese diacritics are normalized/folded for matching — needed
   before the search UI can specify result highlighting.
4. Pagination size and sort order defaults for `/giao-vien` (`getTeacherOverview`
   accepts "pagination/filter" per `docs/contracts/backend.md` but the exact
   shape isn't frozen yet).

## 9. Definition of done for this task

- `docs/ux-spec.md` (this file), `docs/wireframes.md`, `docs/design-tokens.md`
  exist and cross-reference each other instead of duplicating content.
- No file outside `docs/` was changed.
- Every v1 route from KE_HOACH §1.3 has a wireframe, a state matrix row (where
  applicable) and an auth requirement traceable to
  `docs/contracts/backend.md`'s authorization matrix.
- Every open design question this task could not resolve without inventing a
  contract change is listed in §8, not silently decided.
