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

## Phase 4 pilot importer

`pilot_import.py` runs the hybrid converter against the manifest-backed primary DOCX
sources `T06-S01` and `T08-S01`. It writes only `draft` lessons, pending QA queues,
failure reports and local staging assets:

```bash
PYTHONDONTWRITEBYTECODE=1 python3 scripts/import-docx/pilot_import.py
PYTHONDONTWRITEBYTECODE=1 python3 scripts/validate-content/validate.py
```

Assets use the storage-contract key shape
`public/staging-assets/lessons/<sha256-prefix>/<sha256>.<ext>`. These files are review
fixtures, not an R2 upload or a publication signal. `content/pilot-staging-manifest.json`
records source, MDX, report, QA and asset hashes.

An unchanged rerun is a no-op. If a managed file differs from its recorded hash, the
importer writes `content/pilot-import.diff.json` and refuses replacement. After
reviewing that diff, an operator may explicitly retain the edited files and regenerate:

```bash
python3 scripts/import-docx/pilot_import.py \
  --force \
  --backup-dir /an/explicit/safe/backup/path
```

Never place a backup containing manual work under a disposable directory. Neither the
importer nor validator decides chemical correctness or changes status to `published`.
