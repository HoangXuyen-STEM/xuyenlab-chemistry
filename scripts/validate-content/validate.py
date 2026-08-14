#!/usr/bin/env python3
"""Validate generated pilot content, provenance, reports, links and assets."""

from __future__ import annotations

import argparse
import csv
from datetime import datetime
import hashlib
import json
from pathlib import Path
import re
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[2]
REQUIRED_SCALARS = {
    "topic",
    "title",
    "slug",
    "order",
    "summary",
    "keywords",
    "estimatedMinutes",
    "version",
    "status",
}
SLUG = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
TOPIC = re.compile(r"^chuyen-de-(?:0[1-9]|1\d|2[0-6])$")
HASHED_ASSET = re.compile(r"^/staging-assets/lessons/([0-9a-f]{2})/([0-9a-f]{64})(\.[a-z0-9]+)$")
# P6-B1.0: bumped from "1.0.0" when publicationStatus moved from manifest-wide
# to per-lesson. A stale/missing value means the manifest predates that schema.
MANIFEST_VERSION = "1.1.0"
QA_CHECKS = {
    "scopePartIOnly",
    "chemistryVerified",
    "formulasVerified",
    "tablesVerified",
    "figuresVerified",
    "mobileVerified",
    "printVerified",
}
# P6.2: the project owner explicitly authorized approvedForPublish: true for
# exactly these two in_review pilot lessons, despite remaining pending-owner-review
# blocking items. Every other lesson keeps the P4 "must stay false" rule.
P6_OWNER_APPROVED_PUBLISH_SLUGS = {"dong-hoa-hoc", "dung-dich-va-can-bang-hoa-hoc"}
# P6.2 follow-up: approvedForPublish: true additionally requires a structured
# qa.publishWaiver recording the exception at its source, so the reason it is
# permitted is visible directly on the QA record, not only in the contract/handoff.
PUBLISH_WAIVER_TYPE = "P6.2-owner-exception"
PUBLISH_WAIVER_SCOPE = "in_review"
PUBLISH_WAIVER_DOES_NOT_AUTHORIZE = {
    "published",
    "productionDeployment",
    "publicBucketAccess",
    "automaticPublication",
}
# Lesson slugs that must acknowledge specific already-reviewed-and-still-blocked
# ids in their waiver (a subset check; other unresolved ids need no such mention).
PUBLISH_WAIVER_REQUIRED_ACKNOWLEDGED_BLOCKED_ITEMS: dict[str, set[str]] = {
    "dung-dich-va-can-bang-hoa-hoc": {"T08-S01:e6352"},
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def is_iso_8601(value: Any) -> bool:
    if not isinstance(value, str) or not value.strip():
        return False
    try:
        datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return False
    return True


def is_iso_date(value: Any) -> bool:
    if not isinstance(value, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
        return False
    try:
        datetime.fromisoformat(value)
    except ValueError:
        return False
    return True


def validate_publish_waiver(qa: dict[str, Any], relative: str, root: Path) -> list[str]:
    errors: list[str] = []
    waiver = qa.get("publishWaiver")
    if not isinstance(waiver, dict):
        return [f"{relative}: approvedForPublish requires a structured publishWaiver"]

    if waiver.get("type") != PUBLISH_WAIVER_TYPE:
        errors.append(f"{relative}: publishWaiver.type must be {PUBLISH_WAIVER_TYPE!r}")
    if waiver.get("scope") != PUBLISH_WAIVER_SCOPE:
        errors.append(f"{relative}: publishWaiver.scope must be {PUBLISH_WAIVER_SCOPE!r}")
    if not isinstance(waiver.get("authorizedBy"), str) or not waiver["authorizedBy"].strip():
        errors.append(f"{relative}: publishWaiver.authorizedBy is required")
    # Date-only, not a timestamp: the exact authorization time is not reliably
    # established from the source record, so this intentionally avoids asserting
    # a fabricated time-of-day (see docs/contracts/content.md Amendments).
    if not is_iso_date(waiver.get("authorizedDate")):
        errors.append(f"{relative}: publishWaiver.authorizedDate must be an ISO 8601 date (YYYY-MM-DD)")

    does_not_authorize = waiver.get("doesNotAuthorize")
    if not isinstance(does_not_authorize, list) or set(does_not_authorize) != PUBLISH_WAIVER_DOES_NOT_AUTHORIZE:
        errors.append(
            f"{relative}: publishWaiver.doesNotAuthorize must list exactly "
            f"{sorted(PUBLISH_WAIVER_DOES_NOT_AUTHORIZE)}"
        )
    if waiver.get("remediationDebtRetained") is not True:
        errors.append(f"{relative}: publishWaiver.remediationDebtRetained must be true")

    unresolved = qa.get("unresolved", [])
    unresolved_ids = {issue.get("id") for issue in unresolved}
    actual_blocking = sum(1 for issue in unresolved if issue.get("severity") == "blocking")
    if waiver.get("unresolvedBlockingCount") != actual_blocking:
        errors.append(
            f"{relative}: publishWaiver.unresolvedBlockingCount must equal the QA "
            f"record's actual blocking count ({actual_blocking})"
        )

    acknowledged = waiver.get("acknowledgedBlockedItems")
    if not isinstance(acknowledged, list) or not all(isinstance(item, str) for item in acknowledged):
        errors.append(f"{relative}: publishWaiver.acknowledgedBlockedItems must be a string array")
    else:
        unknown = sorted(item for item in acknowledged if item not in unresolved_ids)
        if unknown:
            errors.append(f"{relative}: publishWaiver.acknowledgedBlockedItems references unknown id(s) {unknown}")
        required = PUBLISH_WAIVER_REQUIRED_ACKNOWLEDGED_BLOCKED_ITEMS.get(qa.get("lessonSlug"), set())
        if not required.issubset(acknowledged):
            errors.append(f"{relative}: publishWaiver.acknowledgedBlockedItems must include {sorted(required)}")

    reference = waiver.get("reference")
    if not isinstance(reference, dict):
        errors.append(f"{relative}: publishWaiver.reference is required")
    else:
        for key in ("contractAmendment", "handoff"):
            value = reference.get(key)
            if not isinstance(value, str) or not value.strip():
                errors.append(f"{relative}: publishWaiver.reference.{key} is required")
                continue
            file_part = value.split("#", 1)[0]
            if not (root / file_part).is_file() and not (REPO_ROOT / file_part).is_file():
                errors.append(f"{relative}: publishWaiver.reference.{key} does not point to an existing file")
    return errors


def parse_frontmatter(path: Path) -> tuple[dict[str, str], list[dict[str, str]], str]:
    text = path.read_text(encoding="utf-8")
    if not text.startswith("---\n") or "\n---\n" not in text[4:]:
        raise ValueError("missing delimited frontmatter")
    raw, body = text[4:].split("\n---\n", 1)
    values: dict[str, str] = {}
    sources: list[dict[str, str]] = []
    current_source: dict[str, str] | None = None
    for line in raw.splitlines():
        stripped = line.strip()
        if stripped.startswith("- sourceId:"):
            current_source = {"sourceId": stripped.split(":", 1)[1].strip()}
            sources.append(current_source)
        elif current_source is not None and stripped.startswith(("sourcePath:", "section:")):
            key, value = stripped.split(":", 1)
            current_source[key] = value.strip().strip('"')
        elif not line.startswith(" ") and ":" in line:
            key, value = line.split(":", 1)
            values[key] = value.strip().strip('"')
    return values, sources, body


def validate(root: Path) -> list[str]:
    errors: list[str] = []
    source_manifest = root / "docs/source-manifest.csv"
    if not source_manifest.exists():
        source_manifest = REPO_ROOT / "docs/source-manifest.csv"
    with source_manifest.open(encoding="utf-8", newline="") as handle:
        sources = {row["source_id"]: row for row in csv.DictReader(handle)}
    topics_file = root / "content/topics.ts"
    if not topics_file.exists():
        topics_file = REPO_ROOT / "content/topics.ts"
    known_topics = set(
        re.findall(r'slug:\s*"(chuyen-de-\d{2})"', topics_file.read_text(encoding="utf-8"))
    )

    staging_manifest_path = root / "content/pilot-staging-manifest.json"
    if not staging_manifest_path.is_file():
        return [f"missing {staging_manifest_path.relative_to(root)}"]
    manifest = read_json(staging_manifest_path)
    if manifest.get("strategy") != "hybrid":
        errors.append("pilot manifest must declare hybrid strategy")
    # P6-B1.0: lifecycle status moved from one manifest-wide field to a per-lesson
    # `status` field (see docs/contracts/content.md "Staging manifest"), so lessons
    # can coexist at different stages (e.g. existing in_review pilots alongside a
    # newly imported draft). A manifest still carrying the old field is rejected
    # loudly rather than silently ignored, so an unmigrated file fails clearly.
    if "publicationStatus" in manifest:
        errors.append(
            "pilot manifest publicationStatus is deprecated by P6-B1.0; remove it "
            "and set status per lesson entry instead"
        )
    if manifest.get("manifestVersion") != MANIFEST_VERSION:
        errors.append(
            f"pilot manifest manifestVersion must be {MANIFEST_VERSION!r}, got "
            f"{manifest.get('manifestVersion')!r}"
        )

    seen_slugs: set[str] = set()
    seen_orders: set[tuple[str, int]] = set()
    manifest_lessons = {lesson["mdxPath"]: lesson for lesson in manifest.get("lessons", [])}
    mdx_files = sorted((root / "content/topics").glob("**/*.mdx"))
    if not mdx_files:
        errors.append("no pilot MDX lessons found")
    for path in mdx_files:
        relative = path.relative_to(root).as_posix()
        try:
            values, source_refs, body = parse_frontmatter(path)
        except ValueError as error:
            errors.append(f"{relative}: {error}")
            continue
        missing = sorted(REQUIRED_SCALARS - values.keys())
        if missing:
            errors.append(f"{relative}: missing metadata {', '.join(missing)}")
        topic = values.get("topic", "")
        slug = values.get("slug", "")
        status = values.get("status", "")
        if not TOPIC.fullmatch(topic):
            errors.append(f"{relative}: invalid topic {topic!r}")
        elif topic not in known_topics:
            errors.append(f"{relative}: topic is absent from content/topics.ts")
        if path.parent.name != topic:
            errors.append(f"{relative}: topic does not match directory")
        if not SLUG.fullmatch(slug):
            errors.append(f"{relative}: invalid slug {slug!r}")
        if path.stem != slug:
            errors.append(f"{relative}: slug does not match filename")
        if slug in seen_slugs:
            errors.append(f"{relative}: duplicate slug {slug}")
        seen_slugs.add(slug)
        try:
            order = int(values.get("order", "0"))
            minutes = int(values.get("estimatedMinutes", "0"))
            version = int(values.get("version", "0"))
        except ValueError:
            errors.append(f"{relative}: order, estimatedMinutes and version must be integers")
            order = minutes = version = 0
        if min(order, minutes, version) <= 0:
            errors.append(f"{relative}: numeric metadata must be positive")
        if (topic, order) in seen_orders:
            errors.append(f"{relative}: duplicate topic/order ({topic}, {order})")
        seen_orders.add((topic, order))
        if status not in {"draft", "in_review", "published"}:
            errors.append(f"{relative}: invalid status {status!r}")
        if status == "published":
            errors.append(f"{relative}: P4 validator rejects published content")
        if not source_refs:
            errors.append(f"{relative}: sourceFiles must not be empty")
        for reference in source_refs:
            entry = sources.get(reference.get("sourceId", ""))
            if entry is None:
                errors.append(f"{relative}: unknown sourceId {reference.get('sourceId')}")
            elif entry["source_path"] != reference.get("sourcePath"):
                errors.append(f"{relative}: sourcePath differs from source manifest")
            if not reference.get("section"):
                errors.append(f"{relative}: source section is empty")

        lesson = manifest_lessons.get(relative)
        if lesson is None:
            errors.append(f"{relative}: absent from pilot staging manifest")
            continue
        lesson_status = lesson.get("status")
        if lesson_status not in {"draft", "in_review"}:
            errors.append(
                f"{relative}: manifest lesson entry has missing or invalid status "
                f"{lesson_status!r} (must be draft or in_review)"
            )
        elif status != lesson_status:
            errors.append(
                f"{relative}: status {status!r} differs from its manifest lesson "
                f"status {lesson_status!r}"
            )
        if sha256(path) != lesson.get("mdxSha256"):
            errors.append(f"{relative}: MDX hash drift")
        report_path = root / lesson["failureReportPath"]
        qa_path = root / lesson["qaPath"]
        if not report_path.is_file() or sha256(report_path) != lesson.get("failureReportSha256"):
            errors.append(f"{relative}: missing or drifted failure report")
            continue
        if not qa_path.is_file() or sha256(qa_path) != lesson.get("qaSha256"):
            errors.append(f"{relative}: missing or drifted QA report")
        report = read_json(report_path)
        report_source = report.get("source", {})
        if report_source.get("sourceId") != lesson.get("sourceId") or report_source.get("sourcePath") != lesson.get("sourcePath"):
            errors.append(f"{relative}: failure report provenance drift")
        blocks = report.get("blocks", [])
        derived_blocking = sum(block.get("severity") == "blocking" for block in blocks)
        derived_warning = sum(block.get("severity") == "warning" for block in blocks)
        if derived_blocking != report.get("summary", {}).get("blockingCount") or derived_warning != report.get("summary", {}).get("warningCount"):
            errors.append(f"{relative}: failure report summary drift")
        for block in blocks:
            if block.get("severity") == "blocking" and block.get("id") not in body:
                errors.append(f"{relative}: hidden unresolved blocking issue {block.get('id')}")
        if qa_path.is_file():
            qa = read_json(qa_path)
            approved = qa.get("approvedForPublish")
            if approved not in (True, False):
                errors.append(f"{relative}: approvedForPublish must be true or false")
            elif approved is True:
                if qa.get("lessonSlug") not in P6_OWNER_APPROVED_PUBLISH_SLUGS:
                    errors.append(
                        f"{relative}: approvedForPublish is only permitted for the P6 owner-approved pilot lessons"
                    )
                else:
                    errors.extend(validate_publish_waiver(qa, relative, root))
            if lesson_status == "in_review":
                if not isinstance(qa.get("reviewer"), str) or not qa["reviewer"].strip():
                    errors.append(f"{relative}: in_review QA requires a reviewer")
                if not is_iso_8601(qa.get("reviewedAt")):
                    errors.append(f"{relative}: in_review QA requires an ISO 8601 reviewedAt")
                checks = qa.get("checks")
                if not isinstance(checks, dict) or any(
                    checks.get(check) is not True for check in QA_CHECKS
                ):
                    errors.append(f"{relative}: in_review QA requires every check to be true")
            qa_ids = {issue.get("id") for issue in qa.get("unresolved", [])}
            report_ids = {block.get("id") for block in blocks if block.get("outcome") != "semantic"}
            if qa_ids != report_ids:
                errors.append(f"{relative}: QA unresolved queue differs from failure report")

        references = re.findall(r'(?:src|href)="([^"]+)"', body)
        markdown_references = re.findall(r"\[[^\]\n]+\]\(([^)\n]+)\)", body)
        references += [
            reference
            for reference in markdown_references
            if reference.startswith(("./", "../", "/", "#", "http://", "https://", "mailto:"))
            or re.search(r"\.(?:md|mdx|html?|pdf)(?:#.*)?$", reference)
        ]
        for reference in references:
            if reference.startswith(("https://", "http://", "#", "mailto:")):
                continue
            asset_match = HASHED_ASSET.fullmatch(reference)
            if asset_match:
                asset = root / "public" / reference.removeprefix("/")
                if not asset.is_file():
                    errors.append(f"{relative}: broken asset {reference}")
                elif asset_match.group(1) != asset_match.group(2)[:2] or sha256(asset) != asset_match.group(2):
                    errors.append(f"{relative}: asset hash/path mismatch {reference}")
                continue
            resolved = (path.parent / reference).resolve()
            if not resolved.is_file() or root.resolve() not in resolved.parents:
                errors.append(f"{relative}: broken or unsafe local link {reference}")

    if set(manifest_lessons) != {path.relative_to(root).as_posix() for path in mdx_files}:
        errors.append("pilot staging manifest lesson set differs from content/topics")
    for asset in manifest.get("assets", []):
        path = root / "public" / asset["path"]
        if not path.is_file() or sha256(path) != asset.get("sha256"):
            errors.append(f"asset manifest drift: {asset.get('path')}")
    return errors


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=REPO_ROOT)
    parser.add_argument("--json", action="store_true")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    errors = validate(args.root.resolve())
    if args.json:
        print(json.dumps({"valid": not errors, "errors": errors}, ensure_ascii=False, indent=2))
    elif errors:
        print("Content validation failed:")
        for error in errors:
            print(f"- {error}")
    else:
        print("Content validation passed")
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
