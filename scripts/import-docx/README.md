# DOCX import scripts

Phase 2 conversion prototypes live here. Importers may create drafts only and must
report every failed or omitted object.

## Phase 2 prototype

`prototype.py` is a bounded feasibility tool for DOCX and derivative HTML inputs. It
uses Python's standard library to extract Part I blocks into a staging-only MDX draft,
content-hash browser-safe images and a machine-readable failure report. It never
publishes content and refuses to overwrite changed output unless `--force` is explicit;
forced replacement keeps a content-addressed backup and a hash diff report.

Example:

```bash
python3 scripts/import-docx/prototype.py \
  --source "6. Chuyen de 6. Dong hoa hoc.ok.docx" \
  --source-id T06-S01 \
  --topic 6 \
  --slug conversion-spike-dong-hoa-hoc \
  --title "Conversion spike: Động hóa học" \
  --output-dir /tmp/xuyenlab-conversion-spike
```

The container pins its Debian base-image digest and installs the OS-level LibreOffice
Writer dependency needed for headless conversion experiments:

```bash
docker build -f scripts/import-docx/Dockerfile -t xuyenlab-import-prototype .
```

Building the image is optional for the standard-library extraction path. Phase 2 must
record a failed or unavailable Docker/LibreOffice build truthfully rather than assume
the toolchain was exercised.

## Incremental Part I importer

`pilot_import.py` runs the hybrid converter against a manifest-backed DOCX source. It
writes only a `draft` lesson, pending QA/remediation queues, a failure report and local
staging assets. All five source identity arguments are required together:

```bash
PYTHONDONTWRITEBYTECODE=1 python3 scripts/import-docx/pilot_import.py \
  --source "24. Chuyen de 24_ Phan bon hoa hoc_OK.docx" \
  --source-id T24-S01 \
  --topic 24 \
  --slug phan-bon-hoa-hoc \
  --title "Phân bón hóa học"
```

The source ID, repository-relative path and topic must match
`docs/source-manifest.csv`, and the source disposition must authorize Part I import.
The importer merges only the requested lesson into the existing manifest: unrelated
lesson entries, QA records and assets are preserved. It refuses to regenerate a
requested lesson already at `in_review`, even with `--force`.

Invoking the script without source identity arguments retains the Phase 4 Topic 6/8
fixture mode for regression tests:

```bash
PYTHONDONTWRITEBYTECODE=1 python3 scripts/import-docx/pilot_import.py
PYTHONDONTWRITEBYTECODE=1 python3 scripts/validate-content/validate.py
```

Assets use the storage-contract key shape
`public/staging-assets/lessons/<sha256-prefix>/<sha256>.<ext>`. These files are review
fixtures, not an R2 upload or a publication signal. `content/pilot-staging-manifest.json`
records source, MDX, report, QA and asset hashes.

An unchanged subset rerun is a no-op. If the requested lesson's managed file differs
from its recorded hash, the importer writes `content/pilot-import.diff.json` and
refuses replacement. After reviewing that diff, an operator may explicitly retain the
edited files and regenerate:

```bash
python3 scripts/import-docx/pilot_import.py \
  --source "24. Chuyen de 24_ Phan bon hoa hoc_OK.docx" \
  --source-id T24-S01 --topic 24 \
  --slug phan-bon-hoa-hoc --title "Phân bón hóa học" \
  --force \
  --backup-dir /an/explicit/safe/backup/path
```

Never place a backup containing manual work under a disposable directory. Neither the
importer nor validator decides chemical correctness or changes status to `published`.
