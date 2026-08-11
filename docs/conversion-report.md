# Phase P2 conversion spike report

- Status: Decision recorded — converter, renderer and regression gates are complete;
  project owner selected strategy B on 2026-08-11. Individual sample-by-sample review
  records are not captured in this report.
- Date: 2026-08-11
- Scope: Topic 6 and Topic 8 canonical DOCX candidates plus their derivative HTML
  fidelity references.
- Publication status: no canonical lesson was created or published.

## Objective and decision boundary

This spike tests whether Word/HTML inputs can produce reviewable MDX drafts. It is not
a full importer and does not establish chemical correctness. The Phase 2 exit gate
requires:

1. at least 95% of detected sample blocks to have visible output;
2. every omitted or unsupported block to appear in a machine-readable report;
3. reruns not to overwrite edited MDX silently;
4. the project owner to compare 10–20 representative pages before strategy A, B or C
   is approved.

“Visible output” includes an explicit warning placeholder. It must not be interpreted
as semantic fidelity. The report therefore records visible coverage and semantic
failures separately.

## Inputs

| Source ID | Role                          | Input                                                                      |
| --------- | ----------------------------- | -------------------------------------------------------------------------- |
| `T06-S01` | canonical Word candidate      | `6. Chuyen de 6. Dong hoa hoc.ok.docx`                                     |
| `T06-S02` | derivative fidelity reference | `6. Dong hoa hoc - ly thuyet.html`                                         |
| `T08-S01` | canonical Word candidate      | `8.1. Chuyen de 8-  Dung dich can bang hoa hoc- phan I & II OK (1).docx`   |
| `T08-S02` | derivative fidelity reference | `8.1. Chuyen de 8 - Dung dich, Can bang hoa hoc - Ly thuyet (Phan I).html` |

The manifest keeps both HTML files non-canonical pending owner confirmation of their
provenance.

## Prototype and measurement method

`scripts/import-docx/prototype.py` uses only the Python standard library so the
measurement is reproducible without installing an unreviewed conversion package. It:

- reads OOXML paragraphs, headings, tables, drawings, OMML and OLE objects;
- stops the DOCX draft at the detected Part II boundary;
- reads block-level headings, paragraphs, lists, tables, math and images from the HTML
  references while preserving inline subscript/superscript notation;
- extracts browser-safe raster/vector assets using content-hash names;
- emits only `draft` staging MDX and a JSON failure report;
- emits a visible warning placeholder for unsupported objects;
- treats extracted images without reviewed alt text as warnings;
- produces deterministic output on identical reruns;
- refuses to overwrite a modified target unless `--force` is explicit, and forced
  replacement keeps a hash-based backup plus a diff report.

The committed Dockerfile pins the Debian Bookworm base-image digest and installs Python
3 plus LibreOffice Writer. The image built successfully. A headless smoke test converted
`T06-S01` to a valid 3-page temporary PDF. LibreOffice emitted a non-blocking `javaldx`
warning because Java is intentionally absent from the minimal image. The measured
standard-library extraction path itself does not require LibreOffice.

## Raw source complexity

Counts across the complete DOCX archives, before the Part I boundary is applied:

| Input     | Paragraph XML | Tables | OMML | OLE objects | Drawings | Media | Embeddings |
| --------- | ------------: | -----: | ---: | ----------: | -------: | ----: | ---------: |
| `T06-S01` |         1,839 |     37 |    9 |         643 |       23 |   605 |        643 |
| `T08-S01` |         1,504 |     14 |   54 |         337 |      107 |   252 |        337 |

The OLE density makes a semantic-only strategy high risk. Many OLE previews are WMF,
which is not a dependable browser format and requires conversion or manual recreation.

## Prototype results for Part I

| Input          | Detected blocks | Visible blocks | Visible coverage | Blocking semantic failures | Warnings |
| -------------- | --------------: | -------------: | ---------------: | -------------------------: | -------: |
| `T06-S01` DOCX |             281 |            281 |          100.00% |                         96 |        3 |
| `T06-S02` HTML |             109 |            109 |          100.00% |                          3 |        4 |
| `T08-S01` DOCX |             708 |            708 |          100.00% |                        126 |       42 |
| `T08-S02` HTML |             243 |            243 |          100.00% |                          0 |       18 |

Important interpretation:

- The DOCX visible result includes warning callouts for every unsupported OLE/OMML or
  image format, so it passes the visibility measurement while remaining far below
  acceptable semantic fidelity.
- `T06-S01` has 95 unsupported Part I OLE objects and one non-image drawing.
- `T08-S01` has 121 unsupported Part I OLE objects, two OMML failures, three non-image
  drawings and 31 extracted images needing alt text and visual review. Its 11 flattened
  tables are also warnings.
- The HTML references already expose headings, prose and tables in browser-readable
  form and therefore provide the lowest-effort comparison baseline. They remain
  derivative references, not publication sources.
- The three `T06-S02` HTML math elements are visible but remain blocking until the
  renderer/math task and owner verify equivalent KaTeX/mhchem semantics.

## Failure-report and safety checks

The prototype generated a deterministic issue ID and a block-local source locator for
every detected unsupported block. IDs are stable for unchanged input; source edits may
change locators and IDs. Measured report sizes:

| Input     | Reported issues | Breakdown                                                                           |
| --------- | --------------: | ----------------------------------------------------------------------------------- |
| `T06-S01` |              99 | 95 blocking embedded objects, 1 drawing, 3 table warnings                           |
| `T06-S02` |               7 | 3 blocking math elements, 4 table warnings                                          |
| `T08-S01` |             168 | 121 blocking OLE, 2 blocking OMML, 3 drawings, 31 image warnings, 11 table warnings |
| `T08-S02` |              18 | 18 table warnings                                                                   |

Idempotency checks performed:

1. first run created the target;
2. identical second run returned `unchanged`;
3. after a simulated manual edit, the next run exited non-zero, retained the edited
   target and wrote a hash diff;
4. destructive overwrite was not tested because `--force` is not needed for the
   spike and must remain an explicit operator action.

Negative safety checks also confirmed that path-traversing slugs, malformed source IDs,
and source ID/path/topic mismatches are rejected before a staging target is created.

P2.3 owns the regression corpus and JSON Schema. All four real prototype reports passed
that schema after integration review corrected the non-image fallback rules. The
synthetic contract suite passes independently; a committed black-box Vitest wrapper for
the Python CLI remains pending integration.

## Strategy assessment

| Strategy        | Feasibility finding                                                                                                      | Current assessment                    |
| --------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------- |
| A — semantic    | Prose/headings/tables are tractable, but hundreds of Equation/OLE objects require reliable conversion or manual LaTeX.   | Not feasible as the sole v1 strategy. |
| B — hybrid      | Semantic prose/headings/tables plus reviewed image fallbacks preserves searchability while bounding formula/object work. | **Provisional recommendation.**       |
| C — image-first | Likely to preserve appearance for exceptional blocks but damages accessibility, responsive layout and search.            | Keep only as an exception fallback.   |

**Approved strategy: B — hybrid.** The project owner selected B on 2026-08-11:
text/headings/tables may be converted semantically; complex formulas, objects and
figures require reviewed image fallbacks with alt text/captions. The source selected
for each later draft remains subject to provenance review; the current HTML files are
derivative references and do not authorize automatic publication.

## Owner comparison checklist (P2.4)

Compare 10–20 pages/sections spanning both topics, including:

- a normal heading/prose sequence;
- one multi-column or merged-cell table;
- simple inline chemistry and one display equation;
- at least three OLE/Equation Editor objects;
- a figure with caption;
- an example/problem and its worked solution;
- the transition from Part I to Part II, confirming that Part II is excluded;
- mobile width and A4 print preview in the renderer fixture.

For each sample, record one result: `correct`, `minor edit`, `image fallback`, or
`blocking`. Only the project owner judges chemical correctness and may approve later
publication.

## Open gates

- P2.2 renderer and print preview: PASS (P2.2 handoff; production build verified in
  its task worktree).
- P2.3 schema/regression suite: PASS (including the T06-S02 real-converter black-box
  regression added during integration).
- Prototype report validation against the P2.3 schema: PASS for all four pilot reports.
- Docker/LibreOffice image build and headless Topic 6 PDF smoke test: PASS.
- Owner A/B/C approval: PASS — B selected on 2026-08-11. The per-sample comparison
  record is **UNVERIFIED** because it was not supplied to the integration owner.
