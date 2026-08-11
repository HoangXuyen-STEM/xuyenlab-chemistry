# Phase P2 integration summary — Conversion spike

## Status and verdict

**COMPLETE — READY FOR P3.** Strategy B (hybrid) and this P2 summary were approved
by the project owner on 2026-08-11.

## Objective

Determine whether difficult Topic 6/8 source material can create reviewable MDX
drafts without silently losing unsupported content, and select a feasible v1
conversion strategy. This phase does not publish chemical content or build a full
import pipeline.

## Task handoffs included

- `docs/handoffs/P2/P2.1-codex.md`
- `docs/handoffs/P2/P2.2-claude.md`
- `docs/handoffs/P2/P2.3-copilot.md`
- `docs/handoffs/P2/P2.4-codex.md`

## Completed work

| Task | Outcome |
| --- | --- |
| P2.1 — converter prototype | Bounded DOCX/HTML draft converter, deterministic failure reports, browser-safe asset extraction, idempotency protection, Docker/LibreOffice smoke test and fidelity measurement for T06/T08. |
| P2.2 — MDX renderer | Next.js MDX fixture with KaTeX/mhchem, table, figure, example/callout components, responsive/print styling and renderer tests. |
| P2.3 — regression | JSON Schema, synthetic regression corpus, manifest/provenance checks and a real T06-S02 converter black-box regression. |
| P2.4 — owner review | Staging-only `/fixtures/conversion-review` route with 12 converter-output excerpts. Owner decision B recorded on 2026-08-11. |

## Strategy decision

The project owner selected **B — hybrid** on 2026-08-11.

- Convert text, headings and tables semantically where verified; select the source for
  each later draft only after provenance review.
- Preserve complex formulas, OLE/embedded objects and figures as reviewed image
  fallbacks with chemistry-aware alt text/captions when semantic conversion is not
  verified.
- HTML remains a derivative reference, not an authorization to publish; every lesson
  stays `draft` or `in_review` until the owner approves chemical content.

## Exit-gate evidence

| Requirement | Evidence | Result |
| --- | --- | --- |
| At least 95% visible output | `docs/conversion-report.md` records 100% visible output for all four Part I pilot inputs; warning placeholders count as visible output, not semantic fidelity. | PASS |
| All failures reported | Four machine-readable failure reports with stable IDs/source locators; P2.3 JSON Schema and tests validate the contract. | PASS |
| Rerun preserves edits | P2.1 recorded identical rerun as `unchanged` and modified-target refusal without `--force`; P2.3 black-box regression checks unchanged rerun behavior. | PASS |
| Owner A/B/C decision | Owner selected B on 2026-08-11. Per-sample comparison notes are not supplied. | PASS; sample notes **UNVERIFIED** |

## Validation results

- `npm run verify` on integration before P2.4 build: format, lint, typecheck and 56 tests passed. Local Next build subsequently became **UNVERIFIED** due a stale/failed local Turbopack build process with no diagnostic.
- PR #6 commit `b78cb56` passed GitHub `Validate` and Vercel deployment, independently confirming the integrated production build.
- `git diff --check` passed before commit `b78cb56`.

## Architecture and contract review

- No ADR or frozen contract changed in P2.
- The converter-to-renderer table incompatibility found during P2.4 was corrected:
  `DataTable` now receives explicit HTML table children rather than nested Markdown
  table syntax. This is a scoped compatibility fix, covered by the black-box test.
- Draft-only lifecycle and no-auto-publish constraints were preserved.

## Known risks and deferred work

- Figures in the P2.4 preview are **UNVERIFIED** because extracted draft assets were
  not deployed. P4 must manage R2 assets, reviewed alt text/captions and visual QA.
- HTML provenance is derivative; P4 must retain source traceability and decide the
  suitable source per draft while using canonical Word for comparison/approval.
- Complex formula/OLE conversion is not semantically solved. Strategy B defers this to
  reviewed image fallback or manual MDX/LaTex editing.
- The black-box regression covers T06-S02 only; P4 should add DOCX and Topic 8
  regression coverage as importer behavior expands.
- No canonical lesson is ready for publication. P4 owner QA remains mandatory.

## Integrated reference

- Integration branch: `phase/p2-integration`
- Integrated commit: `b78cb56` (`feat(p2): add conversion review fixture`)
- Pull request: `https://github.com/HoangXuyen-STEM/xuyenlab-chemistry/pull/6`
