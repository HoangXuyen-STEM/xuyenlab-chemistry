"""
Read-only remediation-queue generator for P4.4 triage (docs/qa/tools/README.md).

This is a reference/reproduction tool, not part of the build or the P4.1
importer/validator pipeline. It is not imported or run by any npm script.

Reads (never writes):
  - the two source .docx files (repo root)
  - content/qa/import-reports/*.failure.json (authoritative id/kind/issueCode/severity)

Writes (new files only, never touches an existing project file):
  - public/qa-preview/lessons/<topic>/<issueId>.png  (WMF->PNG formula previews)
  - ./queue-<lessonSlug>.json                         (written next to this
                                                         script; review its
                                                         content before copying
                                                         over
                                                         content/qa/pending/<lessonSlug>.remediation-queue.json)

Run from the repository root:
  python3 docs/qa/tools/generate_remediation_queue.py
"""
import json
import re
import subprocess
import sys
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from docx_object_locator import walk, paragraph_text, NS, relationship_map  # noqa: E402

REPO_ROOT = Path.cwd()
PREVIEW_ROOT = REPO_ROOT / "public" / "qa-preview" / "lessons"

O_NS = "urn:schemas-microsoft-com:office:office"
V_NS = "urn:schemas-microsoft-com:vml"

LESSONS = [
    {
        "sourceId": "T06-S01",
        "topic": "chuyen-de-06",
        "lessonSlug": "dong-hoa-hoc",
        "docx": REPO_ROOT / "6. Chuyen de 6. Dong hoa hoc.ok.docx",
        "report": REPO_ROOT / "content/qa/import-reports/dong-hoa-hoc.failure.json",
    },
    {
        "sourceId": "T08-S01",
        "topic": "chuyen-de-08",
        "lessonSlug": "dung-dich-va-can-bang-hoa-hoc",
        "docx": REPO_ROOT / "8.1. Chuyen de 8-  Dung dich can bang hoa hoc- phan I & II OK (1).docx",
        "report": REPO_ROOT / "content/qa/import-reports/dung-dich-va-can-bang-hoa-hoc.failure.json",
    },
]

PROGID_LABEL = {
    "Equation.DSMT4": "MathType (Equation.DSMT4)",
    "Equation.3": "Microsoft Equation 3.0",
}


def oMath_text(element) -> str:
    texts = [t.text or "" for t in element.findall(".//m:t", NS)]
    return re.sub(r"\s+", " ", "".join(texts)).strip()


def resolve_wmf_target(obj_element, rels: dict) -> str | None:
    imagedata = obj_element.find(f".//{{{V_NS}}}imagedata")
    if imagedata is None:
        return None
    rid = imagedata.attrib.get(f"{{{NS['r']}}}id")
    if not rid:
        return None
    target = rels.get(rid)
    if not target:
        return None
    return f"word/{target}" if not target.startswith("/") else target.lstrip("/")


def _magick_trim_is_blank(png_path: Path) -> bool:
    """True if trimming the rendered PNG to its content bounding box leaves
    nothing (ImageMagick reports 'geometry does not contain image' and/or the
    trimmed result collapses to 1x1) -- i.e. the source WMF genuinely has no
    visible content, independent of which renderer produced it."""
    probe = png_path.with_name(png_path.stem + ".trimprobe.png")
    try:
        result = subprocess.run(
            ["convert", str(png_path), "-trim", "+repage", str(probe)],
            capture_output=True, timeout=30,
        )
        if b"does not contain image" in result.stderr:
            return True
        if probe.exists():
            info = subprocess.run(
                ["identify", "-format", "%wx%h", str(probe)],
                capture_output=True, timeout=10,
            ).stdout.decode()
            return info.strip() == "1x1"
        return False
    finally:
        probe.unlink(missing_ok=True)


def convert_wmf_to_png(archive: zipfile.ZipFile, member: str, out_path: Path) -> tuple[bool, bool]:
    """Returns (converted, is_empty). Tries ImageMagick's WMF delegate first,
    then Inkscape as a fallback for files ImageMagick's delegate rejects
    outright. is_empty is verified by actually rendering and checking the
    content bounding box collapses to nothing -- not guessed from a header
    byte offset."""
    try:
        data = archive.read(member)
    except KeyError:
        return False, False
    # Must end in a real ".wmf" extension: Inkscape's CLI detects format by
    # filename suffix, and out_path.with_suffix(".wmf.tmp") ends in ".tmp".
    tmp_wmf = out_path.parent / (out_path.stem + ".src.wmf")
    tmp_wmf.write_bytes(data)
    try:
        result = subprocess.run(
            ["convert", "-density", "300", "-trim", "+repage",
             "-bordercolor", "white", "-border", "12",
             str(tmp_wmf), str(out_path)],
            capture_output=True, timeout=30,
        )
        if result.returncode == 0 and out_path.exists():
            return True, False
        sys.stderr.write(f"convert failed for {member}, trying inkscape: "
                          f"{result.stderr.decode(errors='replace').strip()}\n")

        raw_png = out_path.with_suffix(".raw.png")
        result = subprocess.run(
            ["inkscape", str(tmp_wmf), "--export-type=png",
             f"--export-filename={raw_png}"],
            capture_output=True, timeout=30,
        )
        if result.returncode != 0 or not raw_png.exists():
            sys.stderr.write(f"inkscape also failed for {member}: "
                              f"{result.stderr.decode(errors='replace').strip()}\n")
            return False, False
        if _magick_trim_is_blank(raw_png):
            raw_png.unlink(missing_ok=True)
            return False, True
        trim = subprocess.run(
            ["convert", str(raw_png), "-trim", "+repage",
             "-bordercolor", "white", "-border", "12", str(out_path)],
            capture_output=True, timeout=30,
        )
        raw_png.unlink(missing_ok=True)
        return trim.returncode == 0 and out_path.exists(), False
    finally:
        tmp_wmf.unlink(missing_ok=True)


def drawing_context_hint(element, prev_text: str, next_text: str) -> str:
    xml_str = ET.tostring(element, encoding="unicode")
    presets = sorted(set(re.findall(r'prstGeom prst="([a-zA-Z0-9]+)"', xml_str)))
    parts = []
    if presets:
        parts.append(f"shape presets: {', '.join(presets)}")
    ctx = " | ".join(t for t in [prev_text, next_text] if t)
    if ctx:
        parts.append(f"surrounding text: {ctx[:160]}")
    return "; ".join(parts) if parts else "no shape/text hint extracted"


def main():
    all_queues = {}
    preview_count = 0

    for lesson in LESSONS:
        report = json.loads(lesson["report"].read_text(encoding="utf-8"))
        blocks_by_id = {b["id"]: b for b in report["blocks"] if b.get("outcome") == "fallback"}

        collector, object_locations, rels = walk(lesson["docx"], lesson["sourceId"])
        computed_ids = {b["id"] for b in collector.blocks}
        missing_from_repro = set(blocks_by_id) - computed_ids
        if missing_from_repro:
            raise RuntimeError(f"{lesson['sourceId']}: could not reproduce {missing_from_repro}")

        preview_dir = PREVIEW_ROOT / lesson["topic"]
        preview_dir.mkdir(parents=True, exist_ok=True)

        queue_items = []
        with zipfile.ZipFile(lesson["docx"]) as archive:
            body = ET.fromstring(archive.read("word/document.xml")).find("w:body", NS)
            body_blocks = list(body)

            for issue_id, block in sorted(blocks_by_id.items()):
                kind = block["kind"]
                loc = block["sourceLocator"]
                item = {
                    "issueId": issue_id,
                    "sourceId": lesson["sourceId"],
                    "topic": lesson["topic"],
                    "lessonSlug": lesson["lessonSlug"],
                    "sourceLocator": {
                        "pathHint": loc["pathHint"],
                        "sectionPath": loc["sectionPath"],
                        "blockOrder": loc["blockOrder"],
                    },
                    "issueCode": block["issueCode"],
                    "kind": kind,
                    "severity": block["severity"],
                    "message": block["message"],
                    "observedType": "unknown",
                    "observedTypeEvidence": "",
                    "previewPath": None,
                    "status": "pending-owner-review",
                    "remediationChoice": None,
                    "ownerDecision": {
                        "decidedBy": None,
                        "decidedAt": None,
                        "altText": None,
                        "caption": None,
                        "qaNote": None,
                    },
                }

                if kind == "table":
                    item["observedType"] = "table"
                    item["observedTypeEvidence"] = (
                        "DOCX <w:tbl> element; already rendered as DataTable on the "
                        "P4.2 staging page (/fixtures/pilot/...)."
                    )
                elif kind == "image":
                    item["observedType"] = "figure"
                    asset_path = block.get("fallback", {}).get("assetPath")
                    item["observedTypeEvidence"] = (
                        "Raster image already extracted by P4.1 to a browser-safe asset."
                    )
                    item["previewPath"] = asset_path
                elif kind == "formula" and issue_id in object_locations:
                    bi, lo, math_el = object_locations[issue_id]
                    text_hint = oMath_text(math_el)
                    item["observedType"] = "formula"
                    item["observedTypeEvidence"] = (
                        "Native OOXML <m:oMath> markup (Word's own equation format); "
                        f"approximate flattened text: \"{text_hint}\""
                        if text_hint else
                        "Native OOXML <m:oMath> markup (Word's own equation format)."
                    )
                elif kind == "embeddedObject" and issue_id in object_locations:
                    bi, lo, obj_el = object_locations[issue_id]
                    ole = obj_el.find(f".//{{{O_NS}}}OLEObject")
                    progid = ole.attrib.get("ProgID") if ole is not None else None
                    if progid in PROGID_LABEL:
                        item["observedType"] = "formula"
                        item["observedTypeEvidence"] = (
                            f'<o:OLEObject ProgID="{progid}"> ({PROGID_LABEL[progid]}) '
                            "read directly from the source DOCX XML."
                        )
                    else:
                        item["observedType"] = "unknown"
                        item["observedTypeEvidence"] = (
                            f'<o:OLEObject ProgID="{progid or "(none found)"}"> is not a '
                            "recognized equation-editor ProgID; needs Owner review in Word."
                        )
                    target = resolve_wmf_target(obj_el, rels)
                    if target:
                        out_path = preview_dir / f"{issue_id.split(':')[1]}.png"
                        converted, empty = convert_wmf_to_png(archive, target, out_path)
                        if converted:
                            item["previewPath"] = (
                                f"/qa-preview/lessons/{lesson['topic']}/{out_path.name}"
                            )
                            preview_count += 1
                        elif empty:
                            item["observedTypeEvidence"] += (
                                f" The source's own embedded preview ({target}) rendered "
                                "and trimmed to nothing (verified with both ImageMagick and "
                                "Inkscape) -- this is a property of the source file itself, "
                                "not a conversion failure. No preview image is possible; "
                                "open the object directly in Word to inspect it."
                            )
                        else:
                            item["observedTypeEvidence"] += (
                                f" (WMF preview at {target} failed to convert; no image available.)"
                            )
                    else:
                        item["observedTypeEvidence"] += " (no WMF preview relationship found.)"
                elif kind == "drawing" and issue_id in object_locations:
                    bi, lo, dr_el = object_locations[issue_id]
                    prev_text = paragraph_text(body_blocks[bi - 2]) if bi >= 2 else ""
                    this_text = paragraph_text(body_blocks[bi - 1])
                    next_text = paragraph_text(body_blocks[bi]) if bi < len(body_blocks) else ""
                    item["observedType"] = "unknown"
                    item["observedTypeEvidence"] = (
                        "Native vector w:drawing (grouped shapes/connectors), no ProgID, "
                        "no browser-safe raster relationship, no LibreOffice available in "
                        "this environment to render it safely. " +
                        drawing_context_hint(dr_el, prev_text or this_text, next_text)
                    )
                else:
                    item["observedTypeEvidence"] = "No XML correlation found for this id."

                queue_items.append(item)

        all_queues[lesson["lessonSlug"]] = queue_items
        print(f"{lesson['sourceId']}: {len(queue_items)} queue items, "
              f"{sum(1 for i in queue_items if i['previewPath'])} with a preview path")

    scratch = Path(__file__).parent
    for slug, items in all_queues.items():
        out = scratch / f"queue-{slug}.json"
        out.write_text(json.dumps(items, ensure_ascii=False, indent=2), encoding="utf-8")
        print("wrote", out)

    print("total previews converted:", preview_count)


if __name__ == "__main__":
    main()
