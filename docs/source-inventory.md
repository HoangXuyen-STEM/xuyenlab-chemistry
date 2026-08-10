# Source inventory — P0.1

- Inventory date: 2026-08-10
- Workspace: XuyenLab Chemistry / HSG-11
- Scope: files at repository root with extension `.docx`, `.doc`, or `.html`
- Detailed classification: [`source-manifest.csv`](source-manifest.csv)

## Summary

| Metric | Value |
|---|---:|
| Total sources | 51 |
| DOCX | 47 |
| Legacy DOC | 2 |
| Derived/pilot HTML | 2 |
| Total size | 133,660,421 bytes (127.47 MiB) |
| DOCX media entries | 13,976 |
| DOCX embedded-object entries | 14,175 |
| `<w:object>` occurrences | 13,866 |
| OMML `<m:oMath>` occurrences | 1,001 |
| Word tables | 1,123 |

Counts cover entire source documents, including Parts II–V. They are complexity indicators, not the amount that will be published in v1.

## Method

1. Enumerated root files by extension and measured byte size.
2. Inspected DOCX ZIP entries under `word/media/` and `word/embeddings/`.
3. Counted OMML, Word object and table elements in `word/document.xml`.
4. Extracted paragraph text and searched for Part I–V headings.
5. Used filenames and internal headings together to assign a provisional role.
6. Marked ambiguous files `needs_review` or `compare`; no ambiguous source was silently selected.

Page counts in `docProps/app.xml` are not used because several files report one page despite substantial content. The two legacy `.doc` files cannot be structurally counted until LibreOffice/compatible tooling is available.

## Provisional topic complexity

The table aggregates media + embedded entries from DOCX only. HTML and legacy `.doc` are excluded. The score includes content outside v1 and will be recalculated after Part I boundaries are known.

| Topic | Media | Embedded | Combined | Provisional risk |
|---:|---:|---:|---:|---|
| 24 | 13 | 8 | 21 | low |
| 2 | 46 | 80 | 126 | low |
| 12 | 97 | 124 | 221 | legacy/high despite low DOCX score |
| 20 | 127 | 142 | 269 | low |
| 16 | 243 | 115 | 358 | low |
| 15 | 246 | 215 | 461 | low |
| 23 | 300 | 172 | 472 | scope review required |
| 25 | 222 | 295 | 517 | medium |
| 19 | 263 | 318 | 581 | medium |
| 22 | 293 | 303 | 596 | medium |
| 17 | 299 | 336 | 635 | medium |
| 10 | 467 | 253 | 720 | medium |
| 13 | 497 | 265 | 762 | medium |
| 3 | 453 | 369 | 822 | medium |
| 14 | 595 | 617 | 1,212 | high |
| 6 | 605 | 643 | 1,248 | high; pilot HTML exists |
| 8 | 540 | 733 | 1,273 | high; pilot HTML exists |
| 11 | 766 | 613 | 1,379 | high |
| 5 | 719 | 920 | 1,639 | high |
| 7 | 1,032 | 1,221 | 2,253 | high |
| 1 | 1,056 | 1,254 | 2,310 | high |
| 4 | 1,187 | 1,300 | 2,487 | high |
| 18 | 1,101 | 1,431 | 2,532 | high |
| 21 | 1,267 | 1,282 | 2,549 | high |
| 9 | 1,542 | 1,166 | 2,708 | high |
| 26 | unknown | unknown | unknown | legacy `.doc`, 16.35 MiB; very high |

## Important classification findings

- Filenames ending in `OK` do not prove v1 eligibility. Several such files contain only Parts III–V.
- The two Topic 13 Part III–V files are near-version candidates, not byte-identical duplicates. Keep the `.Ok` version as the provisional preferred archival copy; both remain excluded from v1.
- Topic 15 has two Part I/II candidates with similar size/word structure. They require a content comparison before choosing the canonical source.
- Topic 18 has one theory-oriented file without standard Part headings and one file whose visible body begins in Part III after template headings. Topic 18 needs manual boundary confirmation.
- Topic 23 has no standard Part I–V boundary in the extracted text. Its relationship to the “Part I only” rule must be decided by the owner.
- Topic 12 and 26 primary candidates are legacy `.doc`; conversion risk is unknown until Phase 2 tooling is available.
- The Topic 6 and 8 HTML files are derivative pilot references. They are not canonical sources but can be used as fidelity baselines.

## Blocking questions for owner review

1. For Topic 9, should Nitrogen and Sulfur be published as separate topic sections or separate lessons under one topic?
2. Which Topic 15 Part I/II file is authoritative?
3. Does Topic 23 belong in v1 even though it does not follow the Part I–V structure?
4. For Topic 18, is `18.1` the authoritative theory source and `18.2` exercise-only?
5. Are the two HTML files owner-approved conversions or only temporary experiments?

These questions do not block repository foundation work. They block only canonical-source selection or publication for the affected topics.

