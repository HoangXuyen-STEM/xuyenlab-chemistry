"""
Read-only DOCX Part-I object locator (docs/qa/tools/README.md).

Reproduces the exact block-traversal and identity-hash algorithm from
scripts/import-docx/prototype.py's IssueCollector/extract_docx (read, not
imported -- this file has no dependency on that module) so that a failure
report's `id`/`pathHint` can be resolved back to the actual XML element (and,
for embeddedObject/formula, its OLE ProgID / WMF preview relationship / OMML
text) in the source .docx. Never writes to the .docx it reads.

Used as a library by generate_remediation_queue.py; the __main__ block below
is a standalone sanity check that recomputes every id in a failure report and
diffs it against the report's own ids (used to validate this file against
both T06-S01 and T08-S01 before trusting it for the P4.4 triage -- see
docs/handoffs/P4/P4.4-remediation-triage-claude.md).

Run from the repository root:
  python3 docs/qa/tools/docx_object_locator.py \\
    "6. Chuyen de 6. Dong hoa hoc.ok.docx" T06-S01 \\
    content/qa/import-reports/dong-hoa-hoc.failure.json
"""
import hashlib
import json
import re
import sys
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

NS = {
    "w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
    "m": "http://schemas.openxmlformats.org/officeDocument/2006/math",
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "v": "urn:schemas-microsoft-com:vml",
    "o": "urn:schemas-microsoft-com:office:office",
}


def safe_text(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def normalize_marker(value: str) -> str:
    import unicodedata
    nfkd = unicodedata.normalize("NFKD", value)
    ascii_only = nfkd.encode("ascii", "ignore").decode("ascii")
    return ascii_only.upper()


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def paragraph_text(element: ET.Element) -> str:
    texts = [t.text or "" for t in element.findall(".//w:t", NS)]
    return "".join(texts)


def relationship_map(archive: zipfile.ZipFile) -> dict:
    try:
        data = archive.read("word/_rels/document.xml.rels")
    except KeyError:
        return {}
    root = ET.fromstring(data)
    result = {}
    for rel in root:
        rid = rel.attrib.get("Id")
        target = rel.attrib.get("Target")
        if rid and target:
            result[rid] = target
    return result


class IssueCollector:
    def __init__(self, source_id):
        self.source_id = source_id
        self.used_ids = set()
        self.blocks = []

    def _identity(self, kind, path_hint, text_anchor):
        codes = {
            "heading": "h", "paragraph": "p", "list": "l", "table": "t",
            "formula": "f", "image": "i", "drawing": "d", "chart": "c",
            "embeddedObject": "e", "smartArt": "s", "shape": "s",
        }
        order = len(self.blocks) + 1
        seed = f"{kind}\0{path_hint}\0{safe_text(text_anchor or '')}".encode()
        suffix = int(sha256_bytes(seed)[:8], 16) % 10_000
        for _ in range(10_000):
            block_id = f"{self.source_id}:{codes[kind]}{suffix:04d}"
            if block_id not in self.used_ids:
                self.used_ids.add(block_id)
                return block_id, order
            suffix = (suffix + 1) % 10_000
        raise RuntimeError("no id")

    def record(self, kind, path_hint, text_anchor=None, **extra):
        block_id, order = self._identity(kind, path_hint, text_anchor)
        entry = {"id": block_id, "kind": kind, "pathHint": path_hint, "blockOrder": order}
        entry.update(extra)
        self.blocks.append(entry)
        return block_id, entry


def find_part_i_range(body_blocks):
    part_i_candidates = [
        i for i, el in enumerate(body_blocks, start=1)
        if re.search(r"\bPHAN I\b", normalize_marker(paragraph_text(el)))
        and not re.search(r"\bPHAN II\b", normalize_marker(paragraph_text(el)))
    ]
    assert len(part_i_candidates) == 1, part_i_candidates
    part_i_start = part_i_candidates[0]
    part_ii_candidates = [
        i for i, el in enumerate(body_blocks, start=1)
        if i > part_i_start and re.search(r"\bPHAN II\b", normalize_marker(paragraph_text(el)))
    ]
    part_i_end = part_ii_candidates[0] if part_ii_candidates else len(body_blocks) + 1
    return part_i_start, part_i_end


def walk(source_path: Path, source_id: str):
    collector = IssueCollector(source_id)
    object_locations = {}  # block_id -> (block_index, local_ordinal, xml element)

    with zipfile.ZipFile(source_path) as archive:
        document = ET.fromstring(archive.read("word/document.xml"))
        rels = relationship_map(archive)
        body = document.find("w:body", NS)
        body_blocks = list(body)
        part_i_start, part_i_end = find_part_i_range(body_blocks)

        ordinals = {}
        def next_ordinal(t):
            ordinals[t] = ordinals.get(t, 0) + 1
            return ordinals[t]

        for block_index, element in enumerate(body_blocks, start=1):
            if block_index < part_i_start or block_index >= part_i_end:
                continue
            tag = element.tag.rsplit("}", 1)[-1]
            text = paragraph_text(element)

            if tag == "tbl":
                n = next_ordinal("table")
                collector.record("table", f"word/document.xml#body/tbl[{n}]", text)
            elif tag == "p" and text:
                style = element.find("./w:pPr/w:pStyle", NS)
                style_value = style.attrib.get(f"{{{NS['w']}}}val", "") if style is not None else ""
                is_heading = bool(
                    style_value.lower().startswith("heading")
                    or re.match(r"^(PHẦN|[IVX]+\.|\d+\.|[A-ZĐ]\.)\s", text)
                )
                collector.record("heading" if is_heading else "paragraph",
                                  f"word/document.xml#body/p[{block_index}]", text)

            for local_ordinal, math_el in enumerate(element.findall(".//m:oMath", NS), start=1):
                next_ordinal("math")
                block_id, entry = collector.record(
                    "formula",
                    f"word/document.xml#body/block[{block_index}]/m:oMath[{local_ordinal}]")
                object_locations[block_id] = (block_index, local_ordinal, math_el)

            object_nodes = element.findall(".//w:object", NS)
            for local_ordinal, obj in enumerate(object_nodes, start=1):
                next_ordinal("embedded-object")
                block_id, entry = collector.record(
                    "embeddedObject",
                    f"word/document.xml#body/block[{block_index}]/w:object[{local_ordinal}]")
                object_locations[block_id] = (block_index, local_ordinal, obj)

            non_image_drawings = [d for d in element.findall(".//w:drawing", NS)
                                   if d.find(".//a:blip", NS) is None]
            for local_ordinal, dr in enumerate(non_image_drawings, start=1):
                next_ordinal("drawing")
                block_id, entry = collector.record(
                    "drawing",
                    f"word/document.xml#body/block[{block_index}]/w:drawing[{local_ordinal}]")
                object_locations[block_id] = (block_index, local_ordinal, dr)

            relationship_ids = sorted({
                n.attrib.get(f"{{{NS['r']}}}embed")
                for n in element.findall(".//a:blip", NS)
                if n.attrib.get(f"{{{NS['r']}}}embed")
            } or [])
            for rid in relationship_ids:
                next_ordinal("image")
                target = rels.get(rid, "")
                member = f"word/{target}" if target and not target.startswith("/") else target.lstrip("/")
                collector.record("image",
                                  f"word/document.xml#body/block[{block_index}]/a:blip[@r:embed='{rid}'] -> {member}")

    return collector, object_locations, rels


if __name__ == "__main__":
    source = Path(sys.argv[1])
    source_id = sys.argv[2]
    expected_ids_file = sys.argv[3] if len(sys.argv) > 3 else None

    collector, object_locations, rels = walk(source, source_id)
    computed_ids = {b["id"] for b in collector.blocks}

    if expected_ids_file:
        report = json.load(open(expected_ids_file))
        expected_ids = {b["id"] for b in report["blocks"]}
        missing = expected_ids - computed_ids
        extra = computed_ids - expected_ids
        print(f"expected={len(expected_ids)} computed={len(computed_ids)}")
        print(f"missing (in report, not reproduced): {len(missing)}", sorted(missing)[:10])
        print(f"extra (reproduced, not in report): {len(extra)}", sorted(extra)[:10])

    print("object_locations sample:", list(object_locations.items())[:3])
