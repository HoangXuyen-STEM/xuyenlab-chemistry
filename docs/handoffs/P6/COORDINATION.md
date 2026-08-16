# P6 content-batch coordination

- Baseline for the completed Topic 2 loop (B1a integration + B2.0 import +
  B2.1 presentation audit + B2.2 Owner QA + B2.3 integration close-out +
  B2.4A candidate diagram + B2.4B policy amendment + B2.4B content
  applied): `main` at `fbbb97b05eced6b72f894f8319db55fbb508b7b3` (PR #48
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
  **merged on `main` at `681de31`** (PR #44). Recorded the Owner's real
  dispositions for all three unresolved items (2 `accepted-with-limitation`,
  1 `blocked`/`remain-blocking`) and promoted Topic 2 `draft` → `in_review`.
  See `docs/handoffs/P6/P6-B2.2-topic2-owner-qa-claude.md`.
- P6-B2.3 (integration/metrics close-out for the Topic 2 loop, the analogue
  of P6-B1.5 for Topic 24) is **merged on `main` at `0a245be`** (PR #45).
  See `docs/handoffs/P6/P6-B2.3-topic2-integration-claude.md`.
- P6-B2.4A (candidate SVG diagram for the still-blocking drawing
  `T02-S01:d1402`) is **merged on `main` at `41dd066`** (PR #46). **No
  remediation status changed**: the item stays `blocked`/`remain-blocking`/
  `severity: "blocking"`; the existing warning Callout is kept alongside
  the candidate diagram, not replaced. See
  `docs/handoffs/P6/P6-B2.4A-topic2-drawing-candidate-claude.md`.
- The Owner approved that candidate ("OK hình", 2026-08-15). P6-B2.4B's
  Phase 0 contract discovery then found no already-valid path both records
  that approval and removes the Callout without inventing an unreviewed
  combination — the pre-existing `applied` status only validated
  `reviewed-latex-mdx` (formula recreation); `reviewed-image-fallback` had
  only ever paired with `blocked` (`T08-S01:e6352`). Presented with this,
  the Owner chose a policy amendment first, kept fully separate from any
  content change. That amendment (extending `applied` to accept
  `reviewed-image-fallback` for `kind: "drawing"`, with a validated
  required-fields/ChemFigure-pairing/Callout-removal rule, proven by
  durable CI-executed tests after a review round) is **merged on `main` at
  `33ba8b0`** (PR #47). See
  `docs/handoffs/P6/P6-B2.4B-policy-applied-drawing-fallback-claude.md`.
- **P6-B2.4B (content)** then applied that newly-authorized combination to
  the real `T02-S01:d1402` item: `status: "applied"`, `remediationChoice:
"reviewed-image-fallback"`, the warning Callout removed, the candidate
  `ChemFigure` (unchanged from PR #46) now the live replacement. **Merged
  on `main` at `fbbb97b`** (PR #48). This closed the Topic 2 loop
  (P6-B2.0 → P6-B2.4B) with zero remaining structurally-blocking
  presentation gaps for staging/teacher-led use. See
  `docs/handoffs/P6/P6-B2.4B-content-topic2-drawing-applied-claude.md`.
- **P6-B2.5** then added a fourth, separate step: the Owner explicitly
  chose the same T06/T08-style (P6.2) publish-exception path for Topic 2
  (option A), after rejecting "production now." `bang-tuan-hoan` gets
  `approvedForPublish: true` plus a structured `publishWaiver` naming
  `T02-S01:d1402` as its one retained/acknowledged blocking item — the
  same governance mechanism, contract amendment and validator allowlist
  already proven for T06/T08, extended to name a third lesson. This is
  **complete in a follow-on PR and awaiting merge** — not yet on `main`.
  **This is not `status: "published"`, not production deployment, not
  public bucket access, and not automatic publication** — the staging
  banner still reads `in_review`/`chưa xuất bản`, and `d1402` stays in
  `unresolved` at `severity: "blocking"` exactly as before. See
  `docs/handoffs/P6/P6-B2.5-topic2-approve-for-publication-claude.md`.
- Current gate is **no longer** "Topic 2 not ready to import" (superseded by
  P6-B2.0), **no longer** "Owner QA for Topic 2" (satisfied by P6-B2.2), and
  the Topic 2 presentation/publish-governance loop (P6-B2.0 → P6-B2.5) is
  fully closed once the P6-B2.5 PR merges — Topic 2 then sits in the exact
  same governance state as T06/T08. The current gate is entirely **Owner
  discretion**: whether to import a further topic (a fresh Owner decision
  and its own bounded preflight, not authorized by any task so far), or a
  future, separate, explicit P7 production/public-access decision. None of
  this is required, and **none of P6-B2.0 through P6-B2.5 is a
  publication or production decision**: no lesson's `status` is
  `published`, and P7 remains an entirely separate later gate.

## Current integrated state (2026-08-16)

- P6-B1.0 through P6-B1.5, P6-B2.0, P6-B2.1, P6-B2.2, P6-B2.3, P6-B2.4A and
  P6-B2.4B (policy + content) are merged on `main`; their handoffs remain
  the canonical task evidence. **The P6-B2.5 PR is open, not yet merged**
  — see that PR before assuming `bang-tuan-hoan` already carries
  `approvedForPublish: true`/a `publishWaiver` on `main`.
- T06 and T08 are each `in_review`, `approvedForPublish: true` with a
  structured `publishWaiver` (the original P6.2 exception).
- T24 is `in_review` with three visible, source-traceable
  `accepted-with-limitation` warnings; its `approvedForPublish` remains
  `false` — it is not a named publish exception.
- T02 (`chuyen-de-02/bang-tuan-hoan`) is `in_review` on `main` as of
  `fbbb97b`, 1 blocking + 2 warning items (frozen historical metric): the
  image and table are `accepted-with-limitation` (2); the drawing is
  `applied`/`reviewed-image-fallback` (1) — the warning Callout is gone,
  the Owner-approved candidate SVG (PR #46) is the live replacement, and
  the item stays in QA `unresolved` at `severity: "blocking"` (P6-B2.4B
  did not clear it, only P6-B2.4A/B resolved the presentation). QA is
  signed (7/7 checks, reviewer/reviewedAt set). **On `main` right now**:
  `approvedForPublish` is still `false`, no `publishWaiver` — the P6-B2.5
  PR (not yet merged) is what adds the T06/T08-style exception naming
  `T02-S01:d1402` as the retained/acknowledged blocking item.
- All four manifest lessons (T02, T06, T08, T24) are `in_review`; none is
  `published`.
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
- Status: **merged on `main` at `681de31`** (PR #44).
- Handoff: `docs/handoffs/P6/P6-B2.2-topic2-owner-qa-claude.md`.

## P6-B2.3 — Topic 2 integration and metrics close-out

- Owner: Claude Code (docs/metrics integration close-out; Owner decisions
  were already made in P6-B2.2, this task only integrates and measures —
  no chemistry, no drawing recreation, no publish waiver, no import of
  another topic). Owner-approved analogue of the plan-named P6-B1.5,
  applied to the Topic 2 loop instead of the Topic 24 loop.
- Prerequisite: P6-B2.2 merged on `main`.
- Deliverable: re-verify the merged Topic 2 state independently (not merely
  re-read the prior task's own claims), measure converter/asset/QA/staging-
  corpus metrics, and state the next gate as Owner-discretion-only —
  explicitly not a new topic's "RECOMMEND IMPORT" verdict.
- Acceptance: metrics table backed by re-run local
  `content:validate`/`vitest`/Playwright/`pdf:dry-run` evidence on the
  merged commit; `docs/handoffs/P6/SUMMARY.md` intentionally not created,
  since P6 as a whole remains in progress.
- Excluded: content/MDX/QA/remediation/manifest edits (read-only verify
  only), drawing recreation/SVG/ChemFigure authorship,
  `approvedForPublish: true`/`publishWaiver`/allowlist change,
  importer/validator/contract/package/lockfile changes, T06/T08/T24 edits,
  auth/R2/P7/public publish, import of Topic 16 or any other topic.
- Status: **merged on `main` at `0a245be`** (PR #45).
- Handoff: `docs/handoffs/P6/P6-B2.3-topic2-integration-claude.md`.

## P6-B2.4A — Topic 2 candidate diagram for the still-blocking drawing

- Owner: Thầy Xuyên specified the exact teaching meaning, alt text and
  caption for the candidate; Claude Code implements it for Owner visual
  review in the PR. Not a chemistry/QA-discretion delegation.
- Prerequisite: P6-B2.3 merged on `main`.
- Deliverable: a print-safe SVG diagram (two-way atomic-structure ↔
  periodic-table-position relation, both feeding element properties; no
  arrow-shaft text; Vietnamese box labels only — meaning fixed by the
  Owner, not invented) inserted into Topic 2's MDX immediately before the
  existing `T02-S01:d1402` warning Callout, which is kept unchanged
  alongside it.
- Acceptance: `content:validate` passes; full unit/E2E suites pass
  unchanged; the fixture route still shows the `in_review` banner; both
  the candidate diagram and the original Callout are visible on the real
  rendered page.
- Excluded: any remediation-queue status/choice change for `T02-S01:d1402`
  (stays `blocked`/`remain-blocking`), QA `unresolved` change,
  `approvedForPublish`/`publishWaiver`/allowlist change, T06/T08/T24 edits,
  the failure report, contract/validator changes, and — explicitly — any
  P6-B2.4B work (registering the asset, resolving the item, updating QA)
  until the Owner reviews and approves the candidate in this PR.
- Status: **merged on `main` at `41dd066`** (PR #46). The Owner approved
  the candidate diagram ("OK hình", 2026-08-15) in review.
- Handoff: `docs/handoffs/P6/P6-B2.4A-topic2-drawing-candidate-claude.md`.

## P6-B2.4B (policy) — Contract amendment for applied drawing replacement

- Owner: the Owner selected this path (amendment first, kept separate from
  content) after Phase 0 contract discovery found no already-valid path
  both records the PR #46 approval and removes the Callout without
  inventing an unreviewed combination. Claude Code implements the
  amendment per that authorization.
- Prerequisite: P6-B2.4A merged on `main` (Owner approval of the candidate
  diagram already given).
- Deliverable: extend `applied`/`reviewed-image-fallback` (previously only
  demonstrated for `applied`/`reviewed-latex-mdx`, and for
  `reviewed-image-fallback` only under `blocked`, `T08-S01:e6352`) to
  `kind: "drawing"` items, with a validated required-fields/ChemFigure-
  pairing/Callout-removal rule in `docs/contracts/content.md` and
  `scripts/validate-content/validate.py`, proven by direct synthetic
  positive/negative-case execution (no Python test infrastructure existed
  to extend).
- Acceptance: `content:validate`/unit/build pass unchanged (no real
  content exercises the new path); the new validator function is proven
  correct with real executed output.
- Excluded: **any change to `content/` or `public/`** — `T02-S01:d1402`
  stays exactly `blocked`/`remain-blocking` with its Callout present;
  applying the new capability to it is separate, later, not-yet-started
  work; also excluded: `approvedForPublish`/`publishWaiver` change,
  T06/T08/T24 edits, package/lockfile, auth, R2, P7.
- Status: **merged on `main` at `33ba8b0`** (PR #47). Durable CI-executed
  tests (`tests/content/operational-acceptance.test.ts`) were added after
  a review round correctly flagged the first push's proof as
  CI-invisible.
- Handoff: `docs/handoffs/P6/P6-B2.4B-policy-applied-drawing-fallback-claude.md`.

## P6-B2.4B (content) — Apply the applied/reviewed-image-fallback disposition to T02-S01:d1402

- Owner: Owner decisions already recorded (visual approval of PR #46,
  authorization of the P6-B2.4B policy path); Claude Code implements the
  content recording only. Integration review before merge.
- Prerequisite: P6-B2.4B (policy) merged on `main` — re-verified at task
  start, not assumed.
- Deliverable: `T02-S01:d1402` → `status: "applied"`, `remediationChoice:
"reviewed-image-fallback"`, `ownerDecision.altText`/`caption` set to
  the exact live `ChemFigure` strings (verified byte-identical
  programmatically), `previewPath` set to the candidate SVG path,
  `reviewedLatex` stays `null`; the warning Callout removed from the MDX
  (the `ChemFigure` itself, already merged in PR #46, is untouched); QA
  record left byte-unchanged (the item already sat in `unresolved` at its
  correct final state); only `mdxSha256` refreshed in the manifest.
- Acceptance: `content:validate` passes and — for the first time —
  actually exercises the P6-B2.4B validator path on real content; full
  unit/E2E suites pass with tests updated only where the disposition
  change required it; `pdf:dry-run` still includes T02; local production
  build confirms the Callout is gone, the diagram is visible, and the
  `in_review` banner and frozen `1`/`2` blocking/warning counts are
  unaffected.
- Excluded: `approvedForPublish: true`/`publishWaiver`/allowlist change,
  contract/validator changes (policy already merged), T06/T08/T24 edits,
  re-import, R2, P7, any chemistry rewrite beyond the Callout removal
  itself.
- Status: **merged on `main` at `fbbb97b`** (PR #48).
- Handoff: `docs/handoffs/P6/P6-B2.4B-content-topic2-drawing-applied-claude.md`.

## P6-B2.5 — Owner approval for later publication (P6.2-style) for Topic 2

- Owner: the Owner chose option A (T06/T08-style approval path) on
  2026-08-16, after explicitly rejecting "production now" — wants
  governance parity with T06/T08, not a P7 production decision. Claude
  Code implements the recording.
- Prerequisite: P6-B2.4B (content) merged on `main` (the drawing already
  `applied`, Callout already gone).
- Deliverable: `bang-tuan-hoan` gets `approvedForPublish: true` plus a
  structured `publishWaiver` (same shape as the T06/T08 P6.2 exception)
  naming `T02-S01:d1402` as its one retained/acknowledged blocking item;
  `P6_OWNER_APPROVED_PUBLISH_SLUGS` and
  `PUBLISH_WAIVER_REQUIRED_ACKNOWLEDGED_BLOCKED_ITEMS` in `validate.py`
  extended to name the third lesson; a new dated Amendments entry in
  `docs/contracts/content.md`.
- Acceptance: `content:validate` passes on the first attempt; QA
  `unresolved`/`checks`/`reviewer`/`reviewedAt`/`reviewStatus` and the
  drawing's `applied` disposition all stay byte-unchanged; the staging
  banner still reads `in_review`/`chưa xuất bản`, never "published"; a
  non-allowlisted lesson still cannot set `approvedForPublish: true`
  (negative control proving the allowlist gate itself still works).
- Excluded: `status: "published"` on any lesson, any MDX/fixture-body/SVG/
  public-asset edit, T06/T08/T24 content changes, R2/deploy/auth/
  package/lockfile changes, any chemistry rewrite.
- Handoff: `docs/handoffs/P6/P6-B2.5-topic2-approve-for-publication-claude.md`.

## Shared gates

- No lesson becomes `published` in P6.
- No live R2 upload occurs without a new explicit Owner authorization.
- No production deployment, public-bucket use or auth/account expansion.
- Every agent reads the plan, relevant ADR/contracts, P5 summary, this coordination
  file and predecessor handoffs before editing.
- CI Validate and Vercel preview must pass for each implementation PR.
