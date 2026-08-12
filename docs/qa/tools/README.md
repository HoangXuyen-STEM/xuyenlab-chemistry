# P4.4 remediation queue tools — reference only

These three scripts produced `content/qa/pending/*.remediation-queue.json`,
`public/qa-preview/lessons/**` and `docs/qa/p4-remediation-queue*.md`. They
are **not** part of the build, not imported by the app, and not run by any
npm script or CI step — they exist so the extraction and the docs are
reproducible after a P4.1 importer rerun or an owner-decision update, per
`docs/handoffs/P4/P4.4-remediation-triage-claude.md`.

`docx_object_locator.py` and `generate_remediation_queue.py` only **read**
the two source `.docx` files (never open them for writing) and only **write**
new files under `public/qa-preview/` and a `queue-<lessonSlug>.json` next to
themselves in this directory. `generate_docs.py` only reads the committed
queue JSON and writes the three `docs/qa/p4-remediation-queue*.md` files.

Requires: Python 3, and on the PATH: ImageMagick's `convert`/`identify`
(with WMF delegate support) and Inkscape (fallback WMF renderer). No
LibreOffice, Word, or network access is used.

## `docx_object_locator.py`

A read-only library that reproduces the importer's exact block-traversal and
identity-hash algorithm (from `scripts/import-docx/prototype.py`, read only —
this file does not import that module) so a failure report's `id`/`pathHint`
can be resolved back to the real XML element. Run standalone to sanity-check
it against a real report before trusting it:

```bash
python3 docs/qa/tools/docx_object_locator.py \
  "6. Chuyen de 6. Dong hoa hoc.ok.docx" T06-S01 \
  content/qa/import-reports/dong-hoa-hoc.failure.json
```

Expect `missing (in report, not reproduced): 0 []` — any non-zero missing
count means the traversal has drifted from the importer and must not be
trusted for correlation until fixed.

## `generate_remediation_queue.py`

Uses the locator to, for every blocking/warning id in both failure reports:

- `table`/`image` kinds: label from the already-certain `kind` (no new
  extraction needed — `image` already has a P4.1 asset).
- `formula` kind (`m:oMath`): label `formula` (certain by construction) plus
  an approximate flattened text hint.
- `embeddedObject` kind: read `<o:OLEObject ProgID="...">` directly from the
  XML. Only `Equation.DSMT4`/`Equation.3` are labeled `formula`; anything
  else is left `unknown` for Owner review — this is the check that satisfies
  "do not assume every OLE object is a formula." Also resolves and converts
  the object's own embedded WMF preview to a PNG.
- `drawing` kind (`w:drawing` with no raster relationship): always `unknown`
  — no ProgID exists to check, and this environment cannot safely render a
  native vector shape. The shape's preset geometry name and the surrounding
  paragraph text are recorded as a hint only.

```bash
python3 docs/qa/tools/generate_remediation_queue.py
```

Writes `docs/qa/tools/queue-<lessonSlug>.json`. **Review it**, then replace
the corresponding `content/qa/pending/<lessonSlug>.remediation-queue.json`
(the script never overwrites that file itself) — and re-run
`npm test -- tests/content/remediation-queue.test.ts` before committing,
since that test is the enforced guarantee that no id/severity was lost or
changed in the process.

## `generate_docs.py`

Rebuilds `docs/qa/p4-remediation-queue.md` and the two per-topic detail docs
straight from the committed `content/qa/pending/*.remediation-queue.json` —
including any `ownerDecision`/`status`/`remediationChoice` values already
recorded there. Run this any time those JSON files change so the docs never
drift from the data (267 rows is too many to hand-edit safely):

```bash
python3 docs/qa/tools/generate_docs.py
```

## After a P4.1 importer rerun

Re-run `docx_object_locator.py`'s sanity check first (must print "missing
... : 0 []"), then `generate_remediation_queue.py`, diff the new
`queue-*.json` against the committed
`content/qa/pending/*.remediation-queue.json`, and manually carry forward any
`ownerDecision`/`status`/`remediationChoice` already recorded on unchanged
ids — the generator always emits a fresh `pending-owner-review` record and
does not know about prior decisions. Finish with `generate_docs.py` and
`npm test -- tests/content/remediation-queue.test.ts`.
