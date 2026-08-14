# P6 content-batch coordination

- Baseline: `main` at `3a6b881de04011b520ad1051029c6f7d8c2e84e8`
- First micro-batch: Topic 24 only
- Current gate: P6-B1.0 implementation is proposed in an open, unmerged PR (see
  `docs/handoffs/P6/P6-B1.0-claude.md`); content import (P6-B1.1) remains
  blocked until that PR is reviewed, merged and green on `main`.

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

## Shared gates

- No lesson becomes `published` in P6.
- No live R2 upload occurs without a new explicit Owner authorization.
- No production deployment, public-bucket use or auth/account expansion.
- Every agent reads the plan, relevant ADR/contracts, P5 summary, this coordination
  file and predecessor handoffs before editing.
- CI Validate and Vercel preview must pass for each implementation PR.
