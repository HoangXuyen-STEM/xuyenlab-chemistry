# P2 Integration Summary

- Status: Final integration review, written by the P2 integration owner after PR
  #6 was merged into `main`.
- This file supersedes the earlier draft of this summary written at integration
  commit `b78cb56` (pre-merge-conflict-resolution). That draft is not deleted
  from history — it is superseded here because it predates the `main` ↔
  `phase/p2-integration` conflict reconciliation and the fresh validation run
  recorded below. Where the two agree, this file repeats the finding; where
  they differ, this file is authoritative because it was verified against the
  current integrated `main`.

## Phase objective

Per `KE_HOACH_XUYENLAB_CHEMISTRY.md` Phase 2: prove whether Word/HTML source
material for Topic 6 and Topic 8 can produce reviewable MDX drafts without
silently losing unsupported content, and obtain an explicit project-owner
decision between conversion strategies A (semantic), B (hybrid) or C
(image-first). Phase 2 does not publish chemical content and does not build a
full import pipeline.

## Integrated deliverables

All of the following are present and verified on `main` at `c9228d0`:

- `scripts/import-docx/prototype.py` — bounded DOCX/HTML → staging-MDX
  converter (standard-library only), with deterministic failure reports,
  content-hashed asset extraction, rerun/idempotency protection and an
  explicit `--force` gate before overwriting an edited target.
- `scripts/import-docx/failure-report.schema.json` — the frozen JSON Schema
  for converter failure reports.
- `tests/converter/` — schema acceptance/rejection tests, a synthetic
  regression corpus (`tests/fixtures/converter/`), and
  `tests/converter/prototype-black-box.test.ts`, which runs the real Python
  converter against manifest-backed `T06-S02` HTML and validates its output.
- `content/fixtures/mdx-renderer.mdx` + `src/app/fixtures/mdx/` — an MDX
  renderer fixture exercising KaTeX/mhchem, `DataTable`, `ChemFigure`,
  `Example`/`Hint`/`Solution`/`Callout`, with mobile and print styling.
- `content/fixtures/conversion-review/*.mdx` +
  `src/app/fixtures/conversion-review/` — a staging-only, `noindex` review
  route with 12 curated converter-output excerpts (3 each from `T06-S01`,
  `T06-S02`, `T08-S01`, `T08-S02`) used for the owner's A/B/C comparison.
- `docs/conversion-report.md` — measurement report, strategy assessment and
  the recorded owner decision.
- No canonical lesson, `content/qa/*` record or `content/topics.ts` entry was
  created — confirmed empty on `main` (`content/topics/` and `content/qa/`
  contain only `.gitkeep`, `content/topics.ts` is an empty placeholder array).

## Task-by-task status

### P2.1 — Converter prototype (`docs/handoffs/P2/P2.1-codex.md`)

**Complete.** Delivered the standard-library converter, Part I boundary
handling, deterministic block IDs/locators, rerun safety, and a Dockerfile
pinning LibreOffice for a headless PDF smoke test. Measured all four Part I
pilot inputs at 100% visible-block coverage while explicitly separating
"visible" (includes warning placeholders) from semantic fidelity: `T06-S01`
has 95 blocking OLE objects, `T08-S01` has 121 blocking OLE + 2 blocking OMML.
Recommended strategy B as provisional, not final.

### P2.2 — MDX renderer (`docs/handoffs/P2/P2.2-claude.md`)

**Complete.** Wired `@next/mdx`, `remark-math`/`rehype-katex` with `mhchem`,
created `mdx-components.tsx`, and replaced the fixture page's hard-coded JSX
with a real MDX import. Fixed an HTML-table-inside-`DataTable` compatibility
issue found while building the fixture (GFM Markdown tables nest invalid
`<table>` elements). `npm run verify` passed in the task's own worktree (10
files / 46 tests at that point).

### P2.3 — Regression contract (`docs/handoffs/P2/P2.3-copilot.md`)

**Complete.** Delivered the failure-report JSON Schema, a synthetic
regression corpus covering semantic/fallback/severity/idempotency cases, and
— in a follow-up correction during integration — the real
`prototype-black-box.test.ts` plus a direct `ajv` devDependency. This file's
current content is a **reconciled merge** of two independently-authored
copies produced when `main` and `phase/p2-integration` both replayed the same
original P2.3 commit and only the integration branch received the follow-up
correction; see "Integration reconciliation" below. The reconciled file
accurately carries forward the original detailed evidence, the black-box
test, the `ajv` dependency, and states its own provenance in an appended
"Integration reconciliation note."

### P2.4 — Owner review fixture (`docs/handoffs/P2/P2.4-codex.md`)

**Complete.** Added the staging-only `/fixtures/conversion-review` route,
fixed the DataTable HTML-table-output defect the fixture exposed (see below),
and recorded the project owner's strategy decision. Two limitations were
explicitly flagged and are addressed under "Known limitations" below: figure
assets were intentionally not deployed to the preview, and the per-sample
comparison record was not supplied to the integration owner.

## Project-owner decisions

**Strategy B — hybrid — selected by the project owner on 2026-08-11.**

- Text, headings and tables may be converted semantically where verified.
- Complex formulas, embedded (OLE/OMML) objects and figures require reviewed
  image fallbacks with chemistry-aware alt text/captions.
- Source selection for each later draft remains subject to provenance review.
- Generated/derivative HTML (the two `*-S02` HTML pilot files) remains a
  non-canonical fidelity reference; it does not authorize automatic
  publication.

This decision is recorded consistently in `docs/conversion-report.md`
("Approved strategy: B — hybrid"), `docs/handoffs/P2/P2.4-codex.md`, and
`docs/handoffs/P2/P2.3-copilot.md`. No repository evidence contradicts it, so
per instruction this review does not reopen the A/B/C choice.

## Integration reconciliation

PR #6 (`phase/p2-integration` → `main`) went `CONFLICTING` because `main` had
independently accumulated its own P2.1/P2.2/P2.3 commits (via PRs #7, #8, #9)
in parallel with `phase/p2-integration`'s P2.1–P2.4 work. Three files
conflicted and were resolved by merging `origin/main` into
`phase/p2-integration` (merge commit `81fa600`), then merging that branch via
PR #6 (merge commit `c9228d0`, merged by the project owner):

1. **`scripts/import-docx/prototype.py`** — a whole-file diff showed the
   _only_ difference between the two independently-written implementations
   was table rendering: `main`'s copy used `table_to_markdown()` (Markdown
   pipe tables inside `<DataTable>`), while `phase/p2-integration`'s copy had
   the P2.4 correction, `table_to_html()` (real `<thead>/<tbody>` HTML).
   Resolution kept the P2.4 HTML-table version because `main`'s version would
   have failed `tests/converter/prototype-black-box.test.ts`, which asserts
   the emitted MDX contains `<DataTable ...>\n\n<tbody>` and does **not**
   contain the Markdown-pipe form. **Verified fresh on current `main`**: `grep`
   confirms `table_to_html`/`<tbody>` is present and `table_to_markdown` does
   not exist in the file; the black-box test passes.
2. **`docs/conversion-report.md`** — `main`'s copy was a strictly earlier
   draft of the same report, written before the owner's decision ("Status:
   Draft ... gates remain open"). `phase/p2-integration`'s copy was the
   later, complete version ("Status: Decision recorded ... strategy B on
   2026-08-11"). No content unique to `main`'s copy existed that wasn't
   already present in the later version, so the later version was kept in
   full.
3. **`docs/handoffs/P2/P2.3-copilot.md`** — hand-merged rather than picked
   from one side, because `main`'s copy had fuller original prose (detailed
   corpus/decision/verification breakdown) while `phase/p2-integration`'s
   copy had a follow-up correction (`11bdbee`) that added the black-box test
   and `ajv` dependency but had condensed other detail in doing so. The
   merged file keeps `main`'s fuller structure and restores the
   integration-branch-only black-box/`ajv` content, with a dated
   reconciliation note disclosing the merge so the provenance is not hidden.

`package.json`/`package-lock.json` auto-merged without conflict (confirmed via
a clean `npm ci`, 576 packages, 0 vulnerabilities).

## Verification

### Local (fresh, run on `main` at `c9228d0`, 2026-08-11)

| Check                                                                                                                                                        | Result                                                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| Branch/sync/clean preflight                                                                                                                                  | VERIFIED — `main` == `origin/main` == `c9228d0`, 0 ahead/behind, clean worktree                                      |
| `git diff --check`                                                                                                                                           | VERIFIED PASS — exit 0                                                                                               |
| `npm ci`                                                                                                                                                     | VERIFIED PASS — exit 0, 576 packages, 0 vulnerabilities                                                              |
| Converter/schema/black-box/fixture tests (`report-schema`, `report-contract`, `prototype-black-box`, `fixtures/conversion-review/page`, `fixtures/mdx/page`) | VERIFIED PASS — 5 files / 13 tests                                                                                   |
| `npm run verify` — format                                                                                                                                    | VERIFIED PASS                                                                                                        |
| `npm run verify` — lint (zero warnings)                                                                                                                      | VERIFIED PASS                                                                                                        |
| `npm run verify` — typecheck                                                                                                                                 | VERIFIED PASS                                                                                                        |
| `npm run verify` — full test suite                                                                                                                           | VERIFIED PASS — 14 files / 56 tests                                                                                  |
| `npm run verify` — production build                                                                                                                          | VERIFIED PASS — `/`, `/_not-found`, `/fixtures/conversion-review`, `/fixtures/mdx` all prerendered as static content |

The P2.4-reported local Turbopack/Webpack build anomaly (build stopping after
"Creating an optimized production build" with no diagnostic) **did not
reproduce** in this run, nor in the merge-conflict-resolution validation run
immediately before PR #6 was pushed. It is treated as **RESOLVED / superseded
by fresh evidence**, not as a persisting defect — see "Known limitations"
for the residual, narrower risk this leaves.

### CI / GitHub

| Check                                                        | Result                                                                                                                            |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| PR #6 merged into `main`                                     | VERIFIED — `state: MERGED`, `mergedAt: 2026-08-11T13:11:53Z`, merge commit `c9228d0`, merged by project owner (`HoangXuyen-STEM`) |
| `Validate` check on the merge commit itself                  | VERIFIED PASS — GitHub check-runs API for `c9228d0`: `Validate` / `completed` / `success`                                         |
| Branch protection on `main`                                  | VERIFIED — required status check `Validate`; pull request required before merging                                                 |
| Required per-task handoffs present under `docs/handoffs/P2/` | VERIFIED — P2.1–P2.4 plus this summary                                                                                            |

### Vercel / external

| Check                                                           | Result                                                                                                                                                                                                                                                                                                                                 |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vercel preview deployment for PR #6 head (`81fa600`)            | VERIFIED PASS — deployment completed, checked directly against the live PR check                                                                                                                                                                                                                                                       |
| Vercel deployment specifically tagged to merge commit `c9228d0` | UNVERIFIED — no deployment record for `c9228d0` was found via the GitHub Deployments API at review time. However, `git diff 81fa600 c9228d0 --stat` is empty (byte-identical tree), so the passing `81fa600` deployment is evidence for the same content now on `main`; it is not, strictly, a deployment record for `c9228d0` itself. |
| Figure/asset rendering in the deployed preview                  | NOT APPLICABLE for phase exit — see "Known limitations"; the P2 plan requires comparison against original Word/HTML sources, not a deployed image-complete preview.                                                                                                                                                                    |

## Known limitations and carried-forward risks

Distinguishing accepted limitations (do not block P3) from blockers (would
block P3). **None of the items below are blockers**; all are accepted
limitations or non-blocking risks, per the reasoning stated for each.

1. **Figure comparison was not done against the deployed preview (accepted
   limitation, not a blocker).** P2.4 intentionally did not deploy extracted
   draft image assets to the staging preview and states this explicitly on
   the route. The P2 plan's actual required comparison step
   (`KE_HOACH_XUYENLAB_CHEMISTRY.md`, P2.4 row) is "đối chiếu 10–20 trang mẫu
   với Word/HTML gốc" — comparison against the **original** Word/HTML
   sources, not against a fully asset-populated web preview. Nothing in the
   plan, ADR-0002 or the content contract requires the staging preview itself
   to render final images. This is therefore category **B**: an explicitly
   accepted limitation carried into later content work, not a P2 phase-exit
   blocker. It does mean P4 (pilot content) must independently manage R2
   asset upload, reviewed alt text/captions and visual QA before any
   figure-bearing lesson can be marked `in_review`.
2. **Per-sample comparison evidence was not supplied to the integration
   owner (non-blocking risk, not a blocker).** The owner's decision (B) is
   recorded with a date, and is consistent across `docs/conversion-report.md`
   and every P2.4-derived document. The P2 plan's stated P2.4 deliverable is
   "quyết định phương án A/B/C" (the decision) — it does not require the
   underlying per-sample checklist artifact to be filed with the integration
   owner as a phase-exit gate item. The exit-gate criteria that _are_ stated
   in the plan (≥95% visible output, 100% failures reported, safe reruns) are
   independently satisfied by the converter measurements and the black-box
   test. This gap is nonetheless worth carrying forward: no auditable record
   exists of _which_ samples the owner reviewed or judged `correct` /
   `minor edit` / `image fallback` / `blocking`, which limits how much later
   phases can lean on "the sample comparison already happened" without
   re-verifying specific content.
3. **OLE/OMML semantic fidelity remains unsolved (accepted, by design of
   strategy B).** `T06-S01` has 95 blocking OLE objects; `T08-S01` has 121
   blocking OLE + 2 blocking OMML equations. Strategy B defers these to
   reviewed image fallback or manual MDX/LaTeX editing; this is not a defect,
   it is the strategy's explicit design, but it means P4/P6 content work
   carries a real, currently-unbounded editorial cost per source.
4. **Black-box real-converter regression coverage is narrow.** Only
   `T06-S02` (HTML) has a real-converter black-box test. The DOCX path and
   Topic 8 are covered only by the synthetic corpus, not by a black-box run
   against real source material. Recommended before P6 content batches scale
   up, not before P3.
5. **No separate Vercel deployment record for the exact merge commit
   `c9228d0`.** Addressed under Verification above; the byte-identical PR-head
   deployment passed, but an operator wanting a deployment record keyed to
   `c9228d0` specifically will not find one yet.
6. **ADR-0002 still describes hybrid as "the default feasibility assumption,
   not yet a final conversion decision."** The owner has since finalized
   strategy B (2026-08-11), so the ADR's wording is now stale relative to
   `docs/conversion-report.md`. This review does not edit the ADR — that
   requires an explicit approved ADR update per `AGENTS.md` — but flags it as
   a small, low-risk documentation follow-up for the integration owner.
7. **P2.4's "Inputs read" list cites two documents that do not exist**
   (`docs/adr/0002-content-model-and-versioning.md`,
   `docs/contracts/content-and-import.md`) — the actual files are
   `docs/adr/0002-content-lifecycle.md` and `docs/contracts/content.md`. The
   substance P2.4 needed from those files was read correctly (confirmed by
   its decisions being consistent with the real ADR/contract text); this is a
   citation/naming slip in the handoff, not a scope or evidence defect.

## Contract / ADR deviations

**None** that require approval. Verified via
`git diff d67a712..c9228d0 --stat -- docs/adr docs/contracts` returning no
output — no P2 task changed any ADR or contract file. The DataTable
HTML-table-output correction (item 1 under "Integration reconciliation") is a
converter-to-renderer compatibility fix within the existing content contract
("DataTable: normal table children"); it does not add, remove or reinterpret
a contract field. Item 6 above (ADR-0002 wording staleness) is a
documentation-currency observation, not a deviation requiring approval.

## P2 phase-exit checklist

Evaluated against `KE_HOACH_XUYENLAB_CHEMISTRY.md` Phase 2's stated exit gate
and task table.

| Criterion                                                            | Status                  | Evidence                                                                                                                                                                       |
| -------------------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ≥95% of detected sample blocks have visible output                   | PASS                    | `docs/conversion-report.md`: 100.00% visible coverage for all four Part I pilot inputs (281/281, 109/109, 708/708, 243/243)                                                    |
| Every omitted/unsupported block appears in a machine-readable report | PASS                    | JSON Schema + Ajv validation of all four real reports (P2.1 handoff); `tests/converter/report-schema.test.ts` + `prototype-black-box.test.ts` pass on current `main`           |
| Reruns do not overwrite edited MDX silently                          | PASS                    | P2.1 manual-edit simulation retained edits and wrote a hash diff without `--force`; black-box test asserts byte-identical unchanged rerun; confirmed passing on current `main` |
| Project owner compared representative pages and chose A/B/C          | PASS                    | Strategy B recorded 2026-08-11, consistent across all P2 documents; underlying per-sample notes UNVERIFIED (non-blocking, see Known limitations #2)                            |
| P2.1–P2.4 task handoffs complete                                     | PASS                    | All four present under `docs/handoffs/P2/`, each states `Status: Complete`                                                                                                     |
| No ADR/contract changed without approval                             | PASS                    | Empty diff across the P2 range for `docs/adr`, `docs/contracts`                                                                                                                |
| No canonical lesson created or published                             | PASS                    | `content/topics/`, `content/qa/` empty except `.gitkeep`; `content/topics.ts` is an empty placeholder                                                                          |
| `main` buildable and green on required CI check                      | PASS                    | `Validate` succeeded on merge commit `c9228d0`; fresh local `npm run verify` passes including production build                                                                 |
| PR #6 merged into `main` without unresolved conflicts                | PASS                    | `mergedAt`/`mergeCommit` confirmed; `git diff --check` clean; three-way conflict resolution documented above                                                                   |
| Preview/external deployment evidence for integrated code             | PASS, with a narrow gap | Vercel PASS on PR-head `81fa600` (byte-identical tree to `c9228d0`); no deployment record keyed to `c9228d0` itself (UNVERIFIED, not FAILED)                                   |

No criterion evaluated FAIL.

## Phase-exit verdict

**READY FOR P3**

### Inputs/constraints P3 must inherit from P2

- **Strategy B (hybrid) is final for v1 conversion**: semantic text/headings/
  tables; reviewed image fallback for complex formulas/OLE/figures; HTML
  stays a non-canonical fidelity reference. P3 (vertical slice) does not need
  to build the full importer, but any P3 work that touches MDX rendering
  (`src/components/mdx/`) must stay compatible with the `DataTable` HTML-table
  contract, the `Example`/`Hint`/`Solution`/`ChemFigure`/`Callout` component
  set, and KaTeX/mhchem via `remark-math`/`rehype-katex`.
- **No canonical lesson exists yet.** P3's vertical slice must use fixture or
  synthetic lesson content for its login → read → progress → PDF flow; it is
  not blocked on real converted content, and must not create a `published`
  lesson.
- **Two accepted limitations carry forward, not as blockers but as scoped
  follow-up work**: (1) figure/asset QA against a deployed preview is P4's
  responsibility, not solved by P2; (2) the owner's per-sample comparison
  record should be captured in writing before/during P4 so later phases have
  an auditable basis for "strategy B was reviewed against real samples."
- **Two non-blocking documentation follow-ups** are recommended for the
  integration owner, not required before P3 starts: refresh ADR-0002's
  "not yet a final decision" wording now that B is final, and correct the
  citation slip in `docs/handoffs/P2/P2.4-codex.md`'s "Inputs read" list.
- **All P1 open questions remain open** (server signal for non-allowlisted
  email, `saveReadingPosition` debounce, search matching semantics, teacher
  overview pagination, plus the P1 integration review's items 1–10). None
  were touched or resolved by P2; P3's backend/UI spike inherits them
  unchanged from `docs/handoffs/P1/SUMMARY.md`.
- **Black-box real-converter regression coverage is narrow** (`T06-S02` only).
  Not a P3 blocker — P3 does not touch the converter — but P6 content batches
  should not scale up without extending it to DOCX and Topic 8.
