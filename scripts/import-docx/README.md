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
