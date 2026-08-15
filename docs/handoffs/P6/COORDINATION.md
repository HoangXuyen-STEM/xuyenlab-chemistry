# P6 content-batch coordination

- Baseline for completed B1a integration + B2.0 import: `main` at
  `f4f4f5322936a1587330a4d962de360e14763407` (PR #41 merged).
- First micro-batch: Topic 24 — **complete through P6-B1.5 integration**.
- P6-B1.5 is **complete**. Its verdict was **Topic 2 verdict: NOT READY TO
  IMPORT**, pending a bounded, read-only Part I object inventory — see
  `docs/handoffs/P6/P6-B1.5-codex.md`.
- The P6-B2.0 **preflight** then ran that bounded inventory and reached a
  distinct, later verdict: **RECOMMEND IMPORT**, based on an isolated,
  executed converter dry-run (not projected from code inspection) — see
  `docs/handoffs/P6/P6-B2.0-topic2-preflight-claude.md`.
- The P6-B2.0 **import** step is the Owner-authorized action taken on that
  preflight verdict, merged on `main` at `f4f4f53` (PR #41). Topic 2
  (`chuyen-de-02/bang-tuan-hoan`) is registered as `draft`, 1 blocking + 2
  warning items, with its `/fixtures/pilot/chuyen-de-02/bang-tuan-hoan`
  presentation route live on `main`. See
  `docs/handoffs/P6/P6-B2.0-import-claude.md`.
- P6-B2.1 (presentation audit of that route on a `main`-baseline production
  build) is **complete in PR #43 and awaiting merge** — not yet on `main`.
  See `docs/handoffs/P6/P6-B2.1-topic2-presentation-claude.md`. State after
  PR #43 merges: no presentation code change, since the audit found none
  required.
- Current gate is **no longer** "Topic 2 not ready to import" (that was
  P6-B1.5's verdict, since superseded by P6-B2.0's preflight and import).
  The current gate is **Owner QA for Topic 2**: dispositioning the image
  (alt text/visual review), the table (visual review) and the blocking
  drawing, then deciding whether to promote the lesson's lifecycle status —
  the same per-lesson gate P6-B1.4 satisfied for Topic 24. Not authorized by
  any task so far.

## Current integrated state (2026-08-15)

- P6-B1.0 through P6-B1.5 and P6-B2.0 are merged on `main`; their handoffs
  remain the canonical task evidence. **P6-B2.1 is open as PR #43, not yet
  merged** — see that PR before assuming its docs-only change is live.
- T06, T08 and T24 are each `in_review` in their own manifest/MDX/QA records.
  T24 has three visible, source-traceable `accepted-with-limitation` warnings;
  its `approvedForPublish` remains `false`.
- T02 (`chuyen-de-02/bang-tuan-hoan`) is `draft`, 1 blocking + 2 warning items
  (image, table, drawing), QA record pending/unsigned, `approvedForPublish`
  `false`. Its fixture route is already live on `main` (from P6-B2.0) and was
  presentation-audited in PR #43 (P6-B2.1, not yet merged); no chemistry
  decision, alt text or Owner QA has been recorded for it.
- P6 as a whole remains in progress. Do **not** create `docs/handoffs/P6/SUMMARY.md`
  until the project owner closes the whole expansion phase, rather than only B1a.

## P6-B1.0 — manifest/import contract

- Owner: Codex integration owner **— reassigned to Claude Code for this
  instance, by explicit project-owner instruction on 2026-08-14, since Codex
  quota/availability was the constraint, not a change in normal ownership.**
  Plan deviation recorded per `KE_HOACH_XUYENLAB_CHEMISTRY.md`'s "Sai lệch so
  với plan" rule; see `docs/handoffs/P6/P6-B1.0-claude.md` for the full record.
  Codex integration review of this contract before P6-B1.1 proceeds is still
  expected practice for cross-cutting contract changes, subject to quota.
- Deliverable: define a backward-compatible per-lesson lifecycle status in the
  staging manifest and its validator/importer consumer rules.
- Required decisions: schema shape, migration of the two pilots, mixed
  `in_review`/`draft` validation, and compatibility/error behavior.
- Allowed scope: ADR/contract/manifest schema documentation and focused contract
  tests or implementation required to prove the design.
- Excluded: chemistry edits, Topic 24 import, publication, production/R2 upload,
  auth and account work.
- Handoff: `docs/handoffs/P6/P6-B1.0-claude.md`.

## P6-B1.1 — parameterized importer and Topic 24 draft

- Owner: GitHub Copilot GPT-5.3-Codex
- Prerequisite: P6-B1.0 merged and green.
- Deliverable: parameterize the pilot importer for explicit source/topic/slug;
  implement the approved mixed-status contract; register Topic 24; import Part I to
  `draft`; produce assets, failure report, QA record and remediation queue.
- Acceptance: two pilot lessons remain unchanged and valid; Topic 24 is `draft`;
  rerun safety is tested; every failed/unsupported object is traceable and visible.
- Excluded: chemistry judgment, `approvedForPublish`, `published`, live R2 upload,
  production workflows and auth.
- Handoff: `docs/handoffs/P6/P6-B1.1-copilot.md`.

## P6-B1.2 — MDX and presentation remediation

- Owner: Claude Code Sonnet
- Prerequisite: P6-B1.1 artifact and remediation queue available.
- Deliverable: mechanical MDX/component fixes plus mobile, accessibility and print
  presentation for Topic 24.
- Acceptance: no unsupported chemistry inference; uncertain items remain visible for
  Owner review; focused UI/build tests pass.
- Excluded: validator/contract logic, QA decision fields, lifecycle status, PDF/R2,
  auth and source-of-truth chemistry decisions.
- Handoff: `docs/handoffs/P6/P6-B1.2-claude.md`.

## P6-B1.3 — regression coverage

- Owner: GitHub Copilot GPT-5.3-Codex
- Prerequisite: P6-B1.2 stable output.
- Deliverable: bounded regression tests for new importer/content patterns, local
  assets/links/metadata and staging rendering.
- Acceptance: `npm run content:validate`, focused tests and `npm run verify` pass;
  no existing pilot regression.
- Excluded: chemistry edits, contract changes, production workflow and live upload.
- Handoff: `docs/handoffs/P6/P6-B1.3-copilot.md`.

## P6-B1.4 — Owner QA

- Owner: Thầy Xuyên
- Deliverable: review scope, chemistry, formulas, tables, figures, mobile and print;
  disposition every blocking item; sign the QA record when accurate.
- Lifecycle: the lesson may advance only to `in_review` in P6. Normal publication
  rules apply; the two-pilot P6.2 waiver is not extended.

## P6-B1.5 — integration and metrics

- Owner: Codex integration owner
- Prerequisite: task handoffs and Owner QA are complete.
- Deliverable: inspect integrated diff, run phase validation, record converter and QA
  metrics, decide whether Topic 2 can enter the next micro-batch, and update
  `docs/handoffs/P6/SUMMARY.md` when the entire phase is actually complete.
- Handoff: `docs/handoffs/P6/P6-B1.5-codex.md`.

## P6-B2.0 — Topic 2 read-only preflight + Part I draft import

- Owner: Copilot by plan; **reassigned to Claude Code for this instance, by
  explicit project-owner instruction on 2026-08-15, since Copilot
  quota/availability was the constraint, not a change in normal ownership.**
  Plan deviation recorded per `KE_HOACH_XUYENLAB_CHEMISTRY.md`'s "Sai lệch so
  với plan" rule.
- Prerequisite: P6-B1.5's preflight gate ("Topic 2 verdict: NOT READY TO
  IMPORT" pending exactly this inventory).
- Deliverable: a bounded, read-only Part I object inventory for `T02-S01`
  (package entries vs. body visual elements, per-category converter
  classification, confirmed by an isolated executed dry-run); then, after
  Owner review of that chat report, the actual Part I draft import via the
  existing incremental importer — same shape as Topic 24's own P6-B1.1
  import (MDX, assets, failure report, pending QA record, remediation queue,
  manifest registration).
- Acceptance: T02 registered as `draft`, 1 blocking + 2 warning items;
  T06/T08/T24 byte-identical; full unit/E2E/build verification passes.
- Excluded: chemistry judgment, `approvedForPublish`, Owner QA recording,
  lifecycle promotion, live R2 upload, production workflows and auth.
- Handoffs: `docs/handoffs/P6/P6-B2.0-topic2-preflight-claude.md`,
  `docs/handoffs/P6/P6-B2.0-import-claude.md`.

## P6-B2.1 — Topic 2 presentation verification + coordination update

- Owner: Claude Code Sonnet (presentation/MDX-component work is Claude-owned
  by plan, the same role as P6-B1.2 — not a quota-driven deviation; this task
  is an Owner-approved extension of the plan authorized after P6-B2.0 merged).
- Prerequisite: P6-B2.0 merged on `main`.
- Deliverable: production/`main`-baseline mechanical presentation audit of
  Topic 2's fixture route (desktop, mobile ~390px, print emulation) and this
  coordination-file update.
- Acceptance: evidence-backed confirmation that the route loads, shows its
  draft banner, blocking Callout and both warning items correctly, with no
  console error and no viewport overflow — or, if a real defect is found, a
  minimal fix to the shared component or the T02 fixture shell only.
- Excluded: chemistry rewrite, alt-text authorship, Owner QA recording,
  lifecycle promotion, `approvedForPublish`, T06/T08/T24 content edits,
  package/lockfile, auth, PDF/R2, P7.
- Status: complete in PR #43, **not yet merged**.
- Handoff: `docs/handoffs/P6/P6-B2.1-topic2-presentation-claude.md`.

## Shared gates

- No lesson becomes `published` in P6.
- No live R2 upload occurs without a new explicit Owner authorization.
- No production deployment, public-bucket use or auth/account expansion.
- Every agent reads the plan, relevant ADR/contracts, P5 summary, this coordination
  file and predecessor handoffs before editing.
- CI Validate and Vercel preview must pass for each implementation PR.
