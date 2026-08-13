# Phase 4 integration summary

- Phase: P4 — Pilot drafts for Topics 6 and 8
- Integration owner: Codex
- Owner approval: Thầy Xuyên (Project Owner), 2026-08-13
- Exit verdict: **READY FOR P5 after this closing PR is green and merged to `main`**

## Phase objective

Move two real Part I pilot lessons through
`source → draft → in_review → staging preview/print QA` without requiring an
application account and without publishing either lesson.

## Included work

- P4.1 / PR #16: deterministic DOCX importer, content-addressed staging assets,
  failure reports, pending QA queues, manifest and content validator.
- P4.2 / PR #17: no-login Topic 6/8 staging routes, real MDX presentation,
  responsive/print treatment and accessibility remediation.
- P4.3 / PR #21: content/asset/remediation regressions and no-login Chromium
  staging E2E against the final P4.5 baseline.
- P4.4 / PR #18: remediation-review queues covering all importer fallback IDs.
- P4.5 / PR #19: six Owner-approved formula replacements applied as traceable
  KaTeX/LaTeX; `T08-S01:e6352` retained as a visible blocked fallback because the
  source diagram depends on unavailable proprietary fonts.
- P4 closing PR: Owner-signed staging QA records, canonical lesson and manifest
  lifecycle changed consistently from `draft` to `in_review`, lifecycle-aware
  validation, and this phase summary.

Task handoffs included:

- `docs/handoffs/P4/P4.1-copilot.md`
- `docs/handoffs/P4/P4.2-claude.md`
- `docs/handoffs/P4/P4.2-fix-claude.md`
- `docs/handoffs/P4/P4.3-copilot.md`
- `docs/handoffs/P4/P4.4-remediation-triage-claude.md`
- `docs/handoffs/P4/P4.5-latex-samples-claude.md`

## Owner decision and lifecycle status

On 2026-08-13, Thầy Xuyên explicitly approved both pilot lessons for
`in_review` staging while retaining the visible fallback warnings and retaining
`T08-S01:e6352` as blocked. This is approval to continue the release-pipeline
staging work, not approval to publish.

- Both canonical MDX lessons: `in_review`.
- Pilot staging manifest: `in_review`.
- Both QA records: signed by the project owner with staging review checks recorded.
- `approvedForPublish`: `false` for both lessons.
- No lesson is `published`.
- Historical importer totals and unresolved IDs remain available for traceability.
  Remediation queues, not raw historical totals, record whether an item is applied,
  pending review or blocked.

The explicit Owner decision is the approved treatment for the normal P4 exit-gate
risk: visible unresolved fallbacks may remain in an `in_review` staging pilot. The
content contract prohibits unresolved blocking issues for `published`; it does not
prohibit them for `in_review`. Publication remains a separate P7 Owner decision.

## Architecture and contract consistency

- Content remains canonical MDX; generated PDFs remain derived artifacts.
- Importer provenance, failure IDs and immutable asset hashes are preserved.
- Staging routes require no application login and remain outside private routes.
- Auth, DB and production R2 behavior were not changed in P4.
- No ADR or contract change was required.
- The lifecycle validator accepts only a consistent pilot-wide `draft` or
  `in_review` state and continues to reject `published` P4 content.

## Validation results

P4.3 final evidence on PR #21:

- content regression: 7/7 passed;
- Chromium staging E2E: 7/7 passed;
- full Vitest: 135/135 passed;
- format, lint and typecheck passed;
- production build passed with all 12 static pages generated;
- Vercel and GitHub Validate passed.

Closing-branch validation:

- `python3 scripts/validate-content/validate.py --json`: passed, `valid: true`;
- `npm run format:check`: passed;
- `npm run lint`: passed;
- `npm run typecheck`: passed;
- `npm test`: 34 files, 137/137 passed;
- `npm run build`: passed outside the restricted sandbox, including TypeScript and
  12/12 static pages; the identical sandboxed build stalled after compilation due to
  the execution environment and was stopped;
- `CI=1 npm run test:e2e -- tests/e2e/pilot-staging.spec.ts`: 7/7 passed;
- `git diff --check`: passed.

GitHub Validate and Vercel results remain the final merge gate. If either fails, this
verdict automatically becomes **NOT READY FOR P5** until repaired and re-run.

## Known risks and deferred work

- `T08-S01:e6352` remains blocked and visibly traceable. A faithful image export
  requires the original proprietary font environment or an Owner-supplied export.
- Other visible fallbacks remain staging QA debt. They do not authorize publication.
- Import-time `blockingCount`/`warningCount` values are historical metrics, not live
  remediation counts.
- Live Neon Auth, real account provisioning, cross-account isolation and live signed
  private-PDF download remain **DEFERRED TO P7**.
- Production R2 upload is not authorized in P4.

## Phase-exit checklist

- [x] Both pilot lessons retain source provenance and machine-readable failure/QA records.
- [x] Every failed conversion remains traceable; no blocking issue is silently hidden.
- [x] No-login desktop/mobile/print staging presentation is available.
- [x] Content, asset, remediation and browser regression coverage passes.
- [x] Project owner approved and signed both pilots for `in_review` staging.
- [x] Both lessons and manifest consistently record `in_review`.
- [x] Both lessons retain `approvedForPublish: false`; nothing is `published`.
- [x] P4 task handoffs are present.
- [ ] Closing PR GitHub Validate and Vercel checks pass and the PR is merged to `main`.

## Required P5 inputs

- Exact merged P4 closing commit on `main` as the common branch point.
- `docs/handoffs/P5/COORDINATION.md` and the P5.1/P5.2 task packets.
- Final owner-signed QA records and remediation queues; consumers must distinguish
  historical importer totals from current remediation state.
- No application account is required for P5 staging work.

## Verdict

**READY FOR P5 after the closing PR passes GitHub Validate and Vercel and is merged
to `main`.** P5.1 and P5.2 must then branch from that same merged commit.
