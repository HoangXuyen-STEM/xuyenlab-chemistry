# P6 A1 — T06 table Owner dispositions (`t3041` / `t2740` / `t6560`)

**Date:** 2026-08-16  
**Scope:** Record Owner A1 decisions on the three remaining warning-severity tables in `dong-hoa-hoc`. **No MDX content rewrite. No publish.**

## Owner quotes (verbatim)

```
t3041: matches-source — accept
t2740: matches-source — accept
t6560: accepted-with-limitation
```

## Evidence used before disposition

| Issue | Caption | DOCX anchor | Example context |
|---|---|---|---|
| `T06-S01:t3041` | Bảng 1 trích từ DOCX | `word/document.xml#body/tbl[1]` | Xà phòng hóa **etyl axetat** (not xyclopropan) |
| `T06-S01:t2740` | Bảng 2 trích từ DOCX | `word/document.xml#body/tbl[2]` | Ví dụ 3 — thủy phân metyl axetat (đề bài) |
| `T06-S01:t6560` | Bảng 3 trích từ DOCX | `word/document.xml#body/tbl[3]` | Inside **Lời giải** Ví dụ 3 |

- Source file: `6. Chuyen de 6. Dong hoa hoc.ok.docx`
- DOCX XML inspection: all three tables are simple grids (**no** `gridSpan` / `vMerge`); blank cells present **in source** for tbl[2] final `t` and tbl[3] two headers + final time cell
- Rendered path: production fixture `/fixtures/pilot/chuyen-de-06/dong-hoa-hoc` at `main@747c342` (and subsequent commit)
- Mobile: page does not expand viewport width; DataTable wrappers use horizontal scroll for wide tables

## Queue writes

All three items in `content/qa/pending/dong-hoa-hoc.remediation-queue.json`:

| Field | Value |
|---|---|
| `status` | `accepted-with-limitation` |
| `remediationChoice` | `owner-accepted-source-fidelity` |
| `ownerDecision.decidedBy` | `Chủ dự án (Owner)` |
| `ownerDecision.decidedAt` | `2026-08-16` |
| `ownerDecision.qaNote` | Verbatim Owner quote + DOCX comparison summary |
| `sourceLocator` | Aligned to failure-report block (includes `textAnchor`) |
| `severity` | unchanged `warning` |
| `kind` | unchanged `table` |

## What did **not** change

- Canonical MDX / body fixture / formula tracers
- `content/qa/pending/dong-hoa-hoc.json` (`approvedForPublish` already true from P6.2)
- `publishWaiver` / production publish / student access
- Formula `applied` items and `d6703` image-fallback

## Tests updated

- `tests/content/remediation-queue.test.ts` — allow new vocabulary; expect 3 tables accepted
- `tests/content/operational-acceptance.test.ts` — T08 stays legacy-only; T06 mixed legacy+new characterized

## Checkpoint A2

- Editorial Style Guide rewrite: PR #59 (§1–2) + PR #60 (§3–6) merged as `747c342`
- PR #58 closed superseded
- Table warnings: **0 pending-owner-review** remaining on T06
- Next product direction still Owner-gated (P7 discovery / T24 style / T08 / stop)
