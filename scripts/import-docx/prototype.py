#!/usr/bin/env python3
"""Bounded Phase 2 Word/HTML to MDX conversion prototype.

This script produces draft staging output and a complete machine-readable issue
report. It deliberately does not claim chemical or mathematical correctness.
"""

from __future__ import annotations

import argparse
import base64
import csv
import hashlib
import html
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import shutil
import tempfile
from typing import Any
import unicodedata
import zipfile
from xml.etree import ElementTree as ET


NS = {
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    "m": "http://schemas.openxmlformats.org/officeDocument/2006/math",
    "o": "urn:schemas-microsoft-com:office:office",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "v": "urn:schemas-microsoft-com:vml",
    "w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
}
REL_NS = {"pr": "http://schemas.openxmlformats.org/package/2006/relationships"}
BROWSER_IMAGE_EXTENSIONS = {".gif", ".jpeg", ".jpg", ".png", ".svg", ".webp"}
REPO_ROOT = Path(__file__).resolve().parents[2]
SOURCE_MANIFEST = REPO_ROOT / "docs/source-manifest.csv"
SOURCE_ID_PATTERN = re.compile(r"^T\d{2}-S\d{2}$")
SLUG_PATTERN = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def normalize_marker(value: str) -> str:
    decomposed = unicodedata.normalize("NFD", value)
    ascii_value = "".join(char for char in decomposed if unicodedata.category(char) != "Mn")
    return re.sub(r"\s+", " ", ascii_value).strip().upper()


def safe_text(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def mdx_text(value: str) -> str:
    return value.replace("{", "&#123;").replace("}", "&#125;")


def yaml_quote(value: str) -> str:
    return json.dumps(value, ensure_ascii=False)


class IssueCollector:
    def __init__(self, source_id: str) -> None:
        self.source_id = source_id
        self.blocks: list[dict[str, Any]] = []
        self.used_ids: set[str] = set()

    def _identity(self, kind: str, path_hint: str, text_anchor: str | None) -> tuple[str, int]:
        codes = {
            "heading": "h",
            "paragraph": "p",
            "list": "l",
            "table": "t",
            "formula": "f",
            "image": "i",
            "drawing": "d",
            "chart": "c",
            "embeddedObject": "e",
            "smartArt": "s",
            "shape": "s",
        }
        order = len(self.blocks) + 1
        identity_seed = f"{kind}\0{path_hint}\0{safe_text(text_anchor or '')}".encode()
        suffix = int(sha256_bytes(identity_seed)[:8], 16) % 10_000
        for _ in range(10_000):
            block_id = f"{self.source_id}:{codes[kind]}{suffix:04d}"
            if block_id not in self.used_ids:
                self.used_ids.add(block_id)
                return block_id, order
            suffix = (suffix + 1) % 10_000
        raise RuntimeError("Could not allocate a unique report block ID")

    def semantic(
        self,
        kind: str,
        semantic_kind: str,
        path_hint: str,
        text_anchor: str | None = None,
    ) -> str:
        block_id, order = self._identity(kind, path_hint, text_anchor)
        locator: dict[str, Any] = {
            "sectionPath": "Phần I",
            "blockOrder": order,
            "pathHint": path_hint,
        }
        if text_anchor:
            locator["textAnchor"] = safe_text(text_anchor)[:240]
        self.blocks.append(
            {
                "id": block_id,
                "kind": kind,
                "sourceLocator": locator,
                "outcome": "semantic",
                "semanticKind": semantic_kind,
            }
        )
        return block_id

    def fallback(
        self,
        kind: str,
        severity: str,
        issue_code: str,
        message: str,
        path_hint: str,
        strategy: str,
        reason: str,
        text_anchor: str | None = None,
        asset_path: str | None = None,
        alt_text: str | None = None,
        caption: str | None = None,
    ) -> str:
        block_id, order = self._identity(kind, path_hint, text_anchor)
        locator: dict[str, Any] = {
            "sectionPath": "Phần I",
            "blockOrder": order,
            "pathHint": path_hint,
        }
        if text_anchor:
            locator["textAnchor"] = safe_text(text_anchor)[:240]
        fallback: dict[str, Any] = {"strategy": strategy, "reason": reason}
        if asset_path:
            fallback["assetPath"] = asset_path
        if alt_text:
            fallback["altText"] = alt_text
        if caption:
            fallback["caption"] = caption
        self.blocks.append(
            {
                "id": block_id,
                "kind": kind,
                "sourceLocator": locator,
                "outcome": "fallback",
                "severity": severity,
                "issueCode": issue_code,
                "message": message,
                "fallback": fallback,
            }
        )
        return block_id

    def omitted(
        self,
        kind: str,
        issue_code: str,
        message: str,
        path_hint: str,
        reason: str,
        text_anchor: str | None = None,
    ) -> str:
        block_id, order = self._identity(kind, path_hint, text_anchor)
        locator: dict[str, Any] = {
            "sectionPath": "Phần I",
            "blockOrder": order,
            "pathHint": path_hint,
        }
        if text_anchor:
            locator["textAnchor"] = safe_text(text_anchor)[:240]
        self.blocks.append(
            {
                "id": block_id,
                "kind": kind,
                "sourceLocator": locator,
                "outcome": "omitted",
                "severity": "blocking",
                "issueCode": issue_code,
                "message": message,
                "fallback": {"strategy": "none", "reason": reason},
            }
        )
        return block_id


class PilotHtmlParser(HTMLParser):
    """Extract useful block-level content without pretending to sanitize HTML."""

    def __init__(self, collector: IssueCollector, assets_dir: Path) -> None:
        super().__init__(convert_charrefs=True)
        self.collector = collector
        self.assets_dir = assets_dir
        self.blocks: list[str] = []
        self.capture_tag: str | None = None
        self.capture_parts: list[str] = []
        self.table_depth = 0
        self.table_text: list[str] = []
        self.ordinals: dict[str, int] = {}

    def next_ordinal(self, block_type: str) -> int:
        value = self.ordinals.get(block_type, 0) + 1
        self.ordinals[block_type] = value
        return value

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attributes = dict(attrs)
        if tag in {"h1", "h2", "h3", "h4", "h5", "h6", "p", "li"} and not self.capture_tag:
            self.capture_tag = tag
            self.capture_parts = []
        elif self.capture_tag and tag in {"sub", "sup"}:
            self.capture_parts.append(f"<{tag}>")
        if tag == "table":
            self.table_depth += 1
            if self.table_depth == 1:
                self.table_text = []
        if tag in {"td", "th", "tr"} and self.table_depth:
            self.table_text.append(" | " if tag in {"td", "th"} else "\n")
        if tag == "img":
            self._handle_image(attributes)
        if tag == "math":
            ordinal = self.next_ordinal("formula")
            issue_id = self.collector.fallback(
                "formula",
                "blocking",
                "HTML_MATH_REQUIRES_REVIEW",
                "HTML math was retained as visible text but not converted to reviewed KaTeX.",
                f"html:math[{ordinal}]",
                "manual-review",
                "Chemical and mathematical semantics require manual review.",
            )
            self.blocks.append(
                f'<Callout type="warning" title="Công thức cần biên tập">'
                f"Chưa xác minh công thức `{issue_id}`.</Callout>"
            )
        if tag in {"object", "embed"}:
            ordinal = self.next_ordinal("embedded-object")
            issue_id = self.collector.fallback(
                "embeddedObject",
                "blocking",
                "UNSUPPORTED_HTML_EMBEDDED_OBJECT",
                "HTML embedded object requires a visible fallback and manual review.",
                f"html:{tag}[{ordinal}]",
                "manual-review",
                "No safe semantic or image conversion was available.",
            )
            self.blocks.append(
                f'<Callout type="warning" title="Đối tượng cần biên tập">'
                f"Không chuyển được đối tượng `{issue_id}`.</Callout>"
            )

    def handle_endtag(self, tag: str) -> None:
        if tag == "table" and self.table_depth:
            self.table_depth -= 1
            if self.table_depth == 0:
                ordinal = self.next_ordinal("table")
                summary = safe_text("".join(self.table_text))[:240]
                self.collector.fallback(
                    "table",
                    "warning",
                    "HTML_TABLE_SIMPLIFIED",
                    "HTML table was simplified for the renderer fixture and needs visual review.",
                    f"html:table[{ordinal}]",
                    "datatable-html",
                    "Merged cells and detailed formatting are not preserved by the prototype.",
                    summary,
                )
                self.blocks.append(
                    '<DataTable caption="Bảng trích từ nguồn HTML">\n\n'
                    f"{mdx_text(summary) or 'Bảng cần đối chiếu thủ công.'}\n\n"
                    "</DataTable>"
                )
        if tag == self.capture_tag:
            value = safe_text("".join(self.capture_parts))
            if value:
                if tag.startswith("h"):
                    level = min(int(tag[1]), 4)
                    ordinal = self.next_ordinal("heading")
                    self.collector.semantic(
                        "heading", "heading", f"html:{tag}[{ordinal}]", value
                    )
                    self.blocks.append(f"{'#' * level} {mdx_text(value)}")
                elif tag == "li":
                    ordinal = self.next_ordinal("list")
                    self.collector.semantic("list", "list", f"html:li[{ordinal}]", value)
                    self.blocks.append(f"- {mdx_text(value)}")
                else:
                    ordinal = self.next_ordinal("paragraph")
                    self.collector.semantic(
                        "paragraph", "paragraph", f"html:p[{ordinal}]", value
                    )
                    self.blocks.append(mdx_text(value))
            self.capture_tag = None
            self.capture_parts = []
        elif self.capture_tag and tag in {"sub", "sup"}:
            self.capture_parts.append(f"</{tag}>")

    def handle_data(self, data: str) -> None:
        if self.capture_tag:
            self.capture_parts.append(data)
        if self.table_depth:
            self.table_text.append(data)

    def _handle_image(self, attributes: dict[str, str | None]) -> None:
        ordinal = self.next_ordinal("image")
        src = attributes.get("src") or ""
        alt = safe_text(attributes.get("alt") or "")
        if src.startswith("data:image/") and ";base64," in src:
            header, encoded = src.split(",", 1)
            media_type = header.split(";", 1)[0].split("/", 1)[1].lower()
            extension = ".jpg" if media_type == "jpeg" else f".{media_type}"
            try:
                payload = base64.b64decode(encoded, validate=True)
            except ValueError:
                payload = b""
            if payload and extension in BROWSER_IMAGE_EXTENSIONS:
                digest = sha256_bytes(payload)[:16]
                filename = f"{digest}{extension}"
                (self.assets_dir / filename).write_bytes(payload)
                self.blocks.append(
                    f'<ChemFigure src="./assets/{filename}" alt={{{yaml_quote(alt or "Hình cần bổ sung mô tả")}}} '
                    'caption="Hình trích từ nguồn HTML" />'
                )
                if alt:
                    self.collector.semantic(
                        "image", "chemfigure", f"html:img[{ordinal}]", alt
                    )
                else:
                    self.collector.fallback(
                        "image",
                        "warning",
                        "IMAGE_ALT_TEXT_REQUIRED",
                        "Extracted image has no meaningful alt text.",
                        f"html:img[{ordinal}]",
                        "chemfigure",
                        "Project owner must add and verify a meaningful description.",
                        asset_path=f"assets/{filename}",
                        alt_text="Hình cần bổ sung mô tả",
                    )
                return
        issue_id = self.collector.fallback(
            "image",
            "blocking",
            "UNSUPPORTED_IMAGE_SOURCE",
            "Image source could not be extracted into a browser-safe local asset.",
            f"html:img[{ordinal}]",
            "manual-review",
            "A reviewed local image fallback must be created.",
        )
        self.blocks.append(
            f'<Callout type="warning" title="Hình cần biên tập">'
            f"Không chuyển được hình `{issue_id}`.</Callout>"
        )


def relationship_map(archive: zipfile.ZipFile) -> dict[str, str]:
    root = ET.fromstring(archive.read("word/_rels/document.xml.rels"))
    return {
        relationship.attrib["Id"]: relationship.attrib["Target"]
        for relationship in root.findall("pr:Relationship", REL_NS)
        if "Id" in relationship.attrib and "Target" in relationship.attrib
    }


def paragraph_text(element: ET.Element) -> str:
    return safe_text("".join(node.text or "" for node in element.findall(".//w:t", NS)))


def table_to_markdown(table: ET.Element) -> str:
    rows: list[list[str]] = []
    for row in table.findall("./w:tr", NS):
        cells = [paragraph_text(cell).replace("|", "\\|") for cell in row.findall("./w:tc", NS)]
        if cells:
            rows.append(cells)
    if not rows:
        return "Bảng rỗng cần đối chiếu thủ công."
    width = max(len(row) for row in rows)
    padded = [row + [""] * (width - len(row)) for row in rows]
    lines = ["| " + " | ".join(padded[0]) + " |", "| " + " | ".join(["---"] * width) + " |"]
    lines.extend("| " + " | ".join(row) + " |" for row in padded[1:])
    return "\n".join(lines)


def validate_manifest_source(args: argparse.Namespace) -> None:
    if not SOURCE_ID_PATTERN.fullmatch(args.source_id):
        raise ValueError("--source-id must match TNN-SNN")
    if not SLUG_PATTERN.fullmatch(args.slug):
        raise ValueError("--slug must be lowercase ASCII kebab-case")
    if not safe_text(args.title):
        raise ValueError("--title must not be empty")

    with SOURCE_MANIFEST.open(encoding="utf-8", newline="") as manifest_file:
        entries = {row["source_id"]: row for row in csv.DictReader(manifest_file)}
    entry = entries.get(args.source_id)
    if entry is None:
        raise ValueError(f"Source ID {args.source_id} is absent from {SOURCE_MANIFEST}")

    try:
        repository_path = args.source.relative_to(REPO_ROOT).as_posix()
    except ValueError as error:
        raise ValueError("--source must resolve inside the repository and match the manifest") from error
    if repository_path != entry["source_path"]:
        raise ValueError(
            f"Source path mismatch for {args.source_id}: expected {entry['source_path']!r}, "
            f"received {repository_path!r}"
        )
    if args.topic != int(entry["topic"]):
        raise ValueError(
            f"Topic mismatch for {args.source_id}: expected {entry['topic']}, received {args.topic}"
        )
    if entry["disposition"] not in {"pilot_import", "pilot_reference"}:
        raise ValueError(
            f"Source {args.source_id} is not authorized for the Phase 2 pilot "
            f"(disposition={entry['disposition']})"
        )


def extract_docx(source: Path, collector: IssueCollector, assets_dir: Path) -> list[str]:
    blocks: list[str] = []
    ordinals: dict[str, int] = {}

    def next_ordinal(block_type: str) -> int:
        value = ordinals.get(block_type, 0) + 1
        ordinals[block_type] = value
        return value

    with zipfile.ZipFile(source) as archive:
        document = ET.fromstring(archive.read("word/document.xml"))
        relationships = relationship_map(archive)
        body = document.find("w:body", NS)
        if body is None:
            raise ValueError("DOCX has no word/document.xml body")

        body_blocks = list(body)
        part_i_candidates = [
            index
            for index, element in enumerate(body_blocks, start=1)
            if re.search(r"\bPHAN I\b", normalize_marker(paragraph_text(element)))
            and not re.search(r"\bPHAN II\b", normalize_marker(paragraph_text(element)))
        ]
        if len(part_i_candidates) != 1:
            collector.omitted(
                "paragraph",
                "PART_I_BOUNDARY_AMBIGUOUS",
                f"Expected one Part I boundary, found {len(part_i_candidates)}.",
                "word/document.xml#body",
                "The project owner must identify the v1 scope boundary before conversion.",
            )
            return blocks

        part_i_start = part_i_candidates[0]
        part_ii_candidates = [
            index
            for index, element in enumerate(body_blocks, start=1)
            if index > part_i_start
            and re.search(r"\bPHAN II\b", normalize_marker(paragraph_text(element)))
        ]
        part_i_end = part_ii_candidates[0] if part_ii_candidates else len(body_blocks) + 1

        for block_index, element in enumerate(body_blocks, start=1):
            if block_index < part_i_start or block_index >= part_i_end:
                continue
            tag = element.tag.rsplit("}", 1)[-1]
            text = paragraph_text(element)

            if tag == "tbl":
                table_number = next_ordinal("table")
                table_markdown = table_to_markdown(element)
                collector.fallback(
                    "table",
                    "warning",
                    "DOCX_TABLE_REQUIRES_VISUAL_REVIEW",
                    "DOCX table was flattened to a Markdown table and needs visual review.",
                    f"word/document.xml#body/tbl[{table_number}]",
                    "manual-review",
                    "Merged cells, widths and borders may not survive the prototype.",
                    paragraph_text(element),
                )
                blocks.append(
                    f'<DataTable caption="Bảng {table_number} trích từ DOCX">\n\n'
                    f"{table_markdown}\n\n</DataTable>"
                )
            elif tag == "p" and text:
                style = element.find("./w:pPr/w:pStyle", NS)
                style_value = style.attrib.get(f"{{{NS['w']}}}val", "") if style is not None else ""
                is_heading = bool(
                    style_value.lower().startswith("heading")
                    or re.match(r"^(PHẦN|[IVX]+\.|\d+\.|[A-ZĐ]\.)\s", text)
                )
                collector.semantic(
                    "heading" if is_heading else "paragraph",
                    "heading" if is_heading else "paragraph",
                    f"word/document.xml#body/p[{block_index}]",
                    text,
                )
                blocks.append(f"{'## ' if is_heading else ''}{mdx_text(text)}")

            for local_ordinal, _math in enumerate(element.findall(".//m:oMath", NS), start=1):
                ordinal = next_ordinal("math")
                issue_id = collector.fallback(
                    "formula",
                    "blocking",
                    "OMML_REQUIRES_SEMANTIC_REVIEW",
                    "OMML equation requires semantic conversion or a reviewed image fallback.",
                    f"word/document.xml#body/block[{block_index}]/m:oMath[{local_ordinal}]",
                    "manual-review",
                    "The prototype cannot guarantee equivalent KaTeX or mhchem semantics.",
                )
                blocks.append(
                    f'<Callout type="warning" title="Công thức cần biên tập">'
                    f"Chưa chuyển semantic công thức `{issue_id}`.</Callout>"
                )

            object_nodes = element.findall(".//w:object", NS)
            for local_ordinal, _object in enumerate(object_nodes, start=1):
                ordinal = next_ordinal("embedded-object")
                issue_id = collector.fallback(
                    "embeddedObject",
                    "blocking",
                    "UNSUPPORTED_OLE_OBJECT",
                    "OLE object cannot be converted semantically by the prototype.",
                    f"word/document.xml#body/block[{block_index}]/w:object[{local_ordinal}]",
                    "manual-review",
                    "A reviewed semantic recreation or browser-safe image fallback is required.",
                )
                blocks.append(
                    f'<Callout type="warning" title="Đối tượng Word cần biên tập">'
                    f"Chưa chuyển đối tượng `{issue_id}`.</Callout>"
                )

            non_image_drawings = [
                drawing for drawing in element.findall(".//w:drawing", NS)
                if drawing.find(".//a:blip", NS) is None
            ]
            for local_ordinal, _drawing in enumerate(non_image_drawings, start=1):
                ordinal = next_ordinal("drawing")
                issue_id = collector.fallback(
                    "drawing",
                    "blocking",
                    "UNSUPPORTED_NON_IMAGE_DRAWING",
                    "Drawing or shape has no extractable browser-safe image relationship.",
                    f"word/document.xml#body/block[{block_index}]/w:drawing[{local_ordinal}]",
                    "manual-review",
                    "A reviewed semantic recreation or browser-safe image fallback is required.",
                )
                blocks.append(
                    f'<Callout type="warning" title="Hình vẽ Word cần biên tập">'
                    f"Chưa chuyển hình vẽ `{issue_id}` (số {ordinal}).</Callout>"
                )

            relationship_ids = {
                node.attrib.get(f"{{{NS['r']}}}embed")
                for node in element.findall(".//a:blip", NS)
                if node.attrib.get(f"{{{NS['r']}}}embed")
            }
            for relationship_id in sorted(relationship_ids):
                ordinal = next_ordinal("image")
                target = relationships.get(relationship_id or "", "")
                member = f"word/{target}" if target and not target.startswith("/") else target.lstrip("/")
                extension = Path(member).suffix.lower()
                if member in archive.namelist() and extension in BROWSER_IMAGE_EXTENSIONS:
                    payload = archive.read(member)
                    filename = f"{sha256_bytes(payload)[:16]}{extension}"
                    (assets_dir / filename).write_bytes(payload)
                    blocks.append(
                        f'<ChemFigure src="./assets/{filename}" alt="Hình trích từ DOCX; cần chủ dự án bổ sung mô tả" '
                        f'caption="Nguồn {collector.source_id}, hình {ordinal}" sourceId="{collector.source_id}" />'
                    )
                    collector.fallback(
                        "image",
                        "warning",
                        "EXTRACTED_IMAGE_REQUIRES_REVIEW",
                        "Extracted image needs meaningful alt text and visual verification.",
                        f"word/document.xml#body/block[{block_index}]/a:blip[@r:embed='{relationship_id}'] -> {member}",
                        "chemfigure",
                        "The prototype cannot infer a chemically accurate description.",
                        asset_path=f"assets/{filename}",
                        alt_text="Hình trích từ DOCX; cần chủ dự án bổ sung mô tả",
                        caption=f"Nguồn {collector.source_id}, hình {ordinal}",
                    )
                else:
                    issue_id = collector.fallback(
                        "image",
                        "blocking",
                        "UNSUPPORTED_IMAGE_FORMAT",
                        f"Unsupported or missing image format: {extension or 'unknown'}.",
                        f"word/document.xml#body/block[{block_index}]/a:blip[@r:embed='{relationship_id}'] -> "
                        f"{member or 'missing-target'}",
                        "manual-review",
                        "Convert the source preview to a reviewed browser-safe asset.",
                    )
                    blocks.append(
                        f'<Callout type="warning" title="Hình cần chuyển định dạng">'
                        f"Chưa chuyển hình `{issue_id}`.</Callout>"
                    )
    return blocks


def extract_html(source: Path, collector: IssueCollector, assets_dir: Path) -> list[str]:
    parser = PilotHtmlParser(collector, assets_dir)
    parser.feed(source.read_text(encoding="utf-8", errors="replace"))
    parser.close()
    return parser.blocks


def frontmatter(args: argparse.Namespace) -> str:
    return "\n".join(
        [
            "---",
            f"topic: chuyen-de-{args.topic:02d}",
            f"title: {yaml_quote(args.title)}",
            f"slug: {args.slug}",
            "order: 1",
            f"summary: {yaml_quote('Bản nháp tự động để đánh giá chiến lược chuyển đổi; chưa được QA hóa học.')}",
            f"keywords: [{yaml_quote('conversion-spike')}]",
            "estimatedMinutes: 1",
            "sourceFiles:",
            f"  - sourceId: {args.source_id}",
            f"    sourcePath: {yaml_quote(args.source.name)}",
            f"    section: {yaml_quote('Phần I conversion spike')}",
            "version: 1",
            "status: draft",
            "---",
        ]
    )


def build_report(
    args: argparse.Namespace, collector: IssueCollector, source_digest: str, blocks: list[str]
) -> dict[str, Any]:
    del blocks
    semantic_count = sum(block["outcome"] == "semantic" for block in collector.blocks)
    fallback_count = sum(block["outcome"] == "fallback" for block in collector.blocks)
    omitted_count = sum(block["outcome"] == "omitted" for block in collector.blocks)
    warning_count = sum(block.get("severity") == "warning" for block in collector.blocks)
    blocking_count = sum(block.get("severity") == "blocking" for block in collector.blocks)
    fixture_id = f"{args.source_id.lower()}-{args.source.suffix.lower().lstrip('.')}-part-i"
    return {
        "$schema": "https://raw.githubusercontent.com/HoangXuyen-STEM/xuyenlab-chemistry/main/scripts/import-docx/failure-report.schema.json",
        "reportVersion": "1.0.0",
        "fixtureId": fixture_id,
        "source": {
            "sourceId": args.source_id,
            "sourcePath": args.source.name,
            "section": "Phần I",
        },
        "generator": {
            "name": "xuyenlab-phase-2-converter-prototype",
            "version": "0.1.0",
            "strategy": args.strategy,
        },
        "run": {
            "runId": f"{fixture_id}-{source_digest[:12]}",
            "runOrdinal": 1,
            "generatedAt": "2026-08-11T00:00:00Z",
            "sourceDigest": f"sha256:{source_digest}",
            "rerunOf": None,
        },
        "summary": {
            "totalBlocks": len(collector.blocks),
            "semanticBlockCount": semantic_count,
            "fallbackBlockCount": fallback_count,
            "omittedBlockCount": omitted_count,
            "issueCount": fallback_count + omitted_count,
            "warningCount": warning_count,
            "blockingCount": blocking_count,
        },
        "blocks": collector.blocks,
    }


def tree_hashes(root: Path) -> dict[str, str]:
    return {
        path.relative_to(root).as_posix(): sha256_bytes(path.read_bytes())
        for path in sorted(root.rglob("*"))
        if path.is_file()
    }


def install_output(staged: Path, target: Path, force: bool) -> str:
    if not target.exists():
        staged.rename(target)
        return "created"
    current = tree_hashes(target)
    proposed = tree_hashes(staged)
    if current == proposed:
        shutil.rmtree(staged)
        return "unchanged"
    diff_path = target.parent / f"{target.name}.diff.json"
    diff_path.write_text(
        json.dumps({"current": current, "proposed": proposed}, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    if not force:
        shutil.rmtree(staged)
        raise FileExistsError(
            f"Refusing to overwrite changed output {target}; inspect {diff_path} or rerun with --force"
        )
    backup = target.parent / f"{target.name}.backup-{sha256_bytes(json.dumps(current, sort_keys=True).encode())[:12]}"
    if backup.exists():
        shutil.rmtree(backup)
    target.rename(backup)
    staged.rename(target)
    return f"replaced; backup={backup.name}; diff={diff_path.name}"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", required=True, type=Path)
    parser.add_argument("--source-id", required=True)
    parser.add_argument("--topic", required=True, type=int, choices=range(1, 27))
    parser.add_argument("--slug", required=True)
    parser.add_argument("--title", required=True)
    parser.add_argument("--output-dir", required=True, type=Path)
    parser.add_argument("--strategy", choices=("semantic", "hybrid", "image-first"), default="hybrid")
    parser.add_argument("--force", action="store_true")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    args.source = args.source.resolve()
    if not args.source.is_file():
        raise FileNotFoundError(args.source)
    if args.source.suffix.lower() not in {".docx", ".html", ".htm"}:
        raise ValueError("Prototype accepts DOCX or HTML only")
    validate_manifest_source(args)
    source_payload = args.source.read_bytes()
    source_digest = sha256_bytes(source_payload)
    args.output_dir.mkdir(parents=True, exist_ok=True)
    target = args.output_dir / f"{args.source_id.lower()}-{args.source.suffix.lower().lstrip('.')}"
    staged = Path(tempfile.mkdtemp(prefix=f".{target.name}-", dir=args.output_dir))
    try:
        assets_dir = staged / "assets"
        assets_dir.mkdir()
        collector = IssueCollector(args.source_id)
        if args.source.suffix.lower() == ".docx":
            blocks = extract_docx(args.source, collector, assets_dir)
        else:
            blocks = extract_html(args.source, collector, assets_dir)
        mdx = frontmatter(args) + "\n\n" + "\n\n".join(blocks) + "\n"
        (staged / f"{args.slug}.mdx").write_text(mdx, encoding="utf-8")
        report = build_report(args, collector, source_digest, blocks)
        (staged / "failure-report.json").write_text(
            json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8"
        )
        if not any(assets_dir.iterdir()):
            assets_dir.rmdir()
        result = install_output(staged, target, args.force)
    except Exception:
        if staged.exists():
            shutil.rmtree(staged)
        raise
    print(json.dumps({"result": result, "target": str(target)}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
