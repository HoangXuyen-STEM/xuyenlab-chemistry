# P6 content-batch coordination

- Baseline for completed B1a integration + B2.0 import + B2.1 presentation
  audit: `main` at `26e44b5c675e037727207429aa85c0d67cf0e7a2` (PR #43
  merged).
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
  (`chuyen-de-02/bang-tuan-hoan`) was registered as `draft`, 1 blocking + 2
  warning items, with its `/fixtures/pilot/chuyen-de-02/bang-tuan-hoan`
  presentation route live on `main`. See
  `docs/handoffs/P6/P6-B2.0-import-claude.md`.
- P6-B2.1 (presentation audit of that route on a `main`-baseline production
  build) is **merged on `main` at `26e44b5`** (PR #43). No presentation code
  change was required. See
  `docs/handoffs/P6/P6-B2.1-topic2-presentation-claude.md`.
- P6-B2.2 (Owner QA recording + lifecycle promotion for Topic 2) is
  **complete in a follow-on PR and awaiting merge** — not yet on `main` as
  of this update. Records the Owner's real dispositions for all three
  unresolved items (2 `accepted-with-limitation`, 1 `blocked`/
  `remain-blocking`) and promotes Topic 2 `draft` → `in_review`. See
  `docs/handoffs/P6/P6-B2.2-topic2-owner-qa-claude.md`.
- Current gate is **no longer** "Topic 2 not ready to import" (that was
  P6-B1.5's verdict, since superseded by P6-B2.0's preflight and import) and
  is **no longer** "Owner QA for Topic 2" (that gate is satisfied by
  P6-B2.2, pending its own merge). The next gate, once P6-B2.2 merges, is
  entirely at Owner discretion: whether to import a further topic, and
  whether to author an SVG/ChemFigure replacement for Topic 2's still-
  blocking drawing (`T02-S01:d1402`) — neither is required, and **this is
  not a publication gate**: `approvedForPublish` stays `false` regardless.

## Current integrated state (2026-08-15)

- P6-B1.0 through P6-B1.5, P6-B2.0 and P6-B2.1 are merged on `main`; their
  handoffs remain the canonical task evidence. **P6-B2.2 is open as a
  follow-on PR, not yet merged** — see that PR before assuming its content
  change is live.
- T06 and T08 are each `in_review` in their own manifest/MDX/QA records.
- T24 is `in_review` with three visible, source-traceable
  `accepted-with-limitation` warnings; its `approvedForPublish` remains
  `false`.
- T02 (`chuyen-de-02/bang-tuan-hoan`) is `draft` on `main` as of `26e44b5`,
  1 blocking + 2 warning items (image, table, drawing), QA record
  pending/unsigned. P6-B2.2 (not yet merged) promotes it to `in_review` with
  2 `accepted-with-limitation` dispositions (image, table) and 1
  `blocked`/`remain-blocking` disposition (the drawing, still blocking);
  `approvedForPublish` stays `false` throughout.
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
- Status: **merged on `main` at `26e44b5`** (PR #43).
- Handoff: `docs/handoffs/P6/P6-B2.1-topic2-presentation-claude.md`.

## P6-B2.2 — Topic 2 Owner QA recording + lifecycle promotion

- Owner: Thầy Xuyên decided; Claude Code records the decision (same
  delegation basis as P6-B1.0/P6-B2.0's ownership notes — recording an
  already-made Owner decision faithfully, not a delegation of chemistry
  judgment, QA discretion or publication authority). Integration review
  before merge.
- Prerequisite: P6-B2.1 merged on `main` (route live and presentation-clean).
- Deliverable: record the Owner's real dispositions for Topic 2's three
  unresolved items — the image and the table as
  `accepted-with-limitation` (`owner-accepted-visible-fallback` /
  `owner-accepted-source-fidelity`, the only contract-valid choices for
  their respective kinds), and the drawing as `blocked`/`remain-blocking`
  (explicitly not `accepted-with-limitation`, since its failure-report
  block carries no `fallback.assetPath`/`altText` to pair against) — sign
  all seven QA checks, and promote the lesson `draft` → `in_review`.
- Acceptance: `npm run content:validate` passes with the dispositions
  recorded exactly as the Owner specified (no contract amendment); T02
  `in_review`, `approvedForPublish` stays `false`; T06/T08/T24 byte-
  identical; full unit/E2E/build verification passes; T02 now eligible for
  PDF dry-run generation, matching T06/T08/T24's own established pattern.
- Excluded: contract/validator amendment, chemistry rewrite, semantic alt
  text authorship, `approvedForPublish: true`, `publishWaiver`, `published`,
  re-import, package/lockfile, auth, R2, P7, T06/T08/T24 content edits.
- Plan-extension note: not itself named in the plan text; it is the direct
  structural analogue of the plan-named P6-B1.4 (Topic 24's own Owner QA
  step), applied to Topic 2 and authorized by the Project Owner as this
  task.
- Handoff: `docs/handoffs/P6/P6-B2.2-topic2-owner-qa-claude.md`.

## Shared gates

- No lesson becomes `published` in P6.
- No live R2 upload occurs without a new explicit Owner authorization.
- No production deployment, public-bucket use or auth/account expansion.
- Every agent reads the plan, relevant ADR/contracts, P5 summary, this coordination
  file and predecessor handoffs before editing.
- CI Validate and Vercel preview must pass for each implementation PR.
