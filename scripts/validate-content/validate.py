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
# P6-B1.3P: operational teaching acceptance vocabulary for
# content/qa/pending/<slug>.remediation-queue.json entries. Additive only —
# every other legacy status/choice combination (pending-owner-review/applied/
# blocked paired with reviewed-latex-mdx/reviewed-image-fallback/
# remain-blocking/null) is still never rejected or rewritten by this
# validator, except for the one specific combination named below (P6-B2.4B);
# see docs/contracts/content.md "Remediation queue".
REMEDIATION_NEW_STATUS = "accepted-with-limitation"
REMEDIATION_NEW_CHOICES = {
    "owner-accepted-source-fidelity",
    "owner-accepted-visible-fallback",
}
# Initial supported use per choice (docs/contracts/content.md "Choice
# semantics"); extending to another kind requires a later contract amendment.
REMEDIATION_CHOICE_KIND = {
    "owner-accepted-source-fidelity": "table",
    "owner-accepted-visible-fallback": "image",
}
# P6-B2.4B: the one legacy combination this validator does check. Initial
# supported use is `kind: "drawing"` only (docs/contracts/content.md
# "Applied reviewed-image-fallback"); extending to another kind requires a
# later contract amendment. This is a capability amendment only — it does
# not itself change any committed remediation-queue item.
REMEDIATION_APPLIED_STATUS = "applied"
REMEDIATION_APPLIED_IMAGE_FALLBACK_CHOICE = "reviewed-image-fallback"
REMEDIATION_APPLIED_IMAGE_FALLBACK_KINDS = {"drawing"}
DISCUSSION_PROMPT_CLASSIFICATION = "discussion-prompt"
DISCUSSION_PROMPT_SCIENTIFIC_STATUS = "not-a-verified-scientific-conclusion"
DISCUSSION_PROMPT_IDENTITY_ASSURANCE = "declared-not-authenticated"


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


def validate_discussion_prompt(item: dict[str, Any], relative: str) -> list[str]:
    """Optional on any remediation item; never generated automatically from a
    converter failure (there is no such generation code anywhere in this
    repository) and never alters severity/status/QA checks/publication —
    those are simply not read anywhere below."""
    prompt = item.get("discussionPrompt")
    if prompt is None:
        return []
    issue_id = item.get("issueId", "?")
    if not isinstance(prompt, dict):
        return [f"{relative}: {issue_id} discussionPrompt must be an object"]

    errors: list[str] = []
    if prompt.get("classification") != DISCUSSION_PROMPT_CLASSIFICATION:
        errors.append(
            f"{relative}: {issue_id} discussionPrompt.classification must be "
            f"{DISCUSSION_PROMPT_CLASSIFICATION!r}"
        )
    if not isinstance(prompt.get("recordedBy"), str) or not prompt["recordedBy"].strip():
        errors.append(f"{relative}: {issue_id} discussionPrompt.recordedBy is required")
    if not is_iso_date(prompt.get("recordedDate")):
        errors.append(
            f"{relative}: {issue_id} discussionPrompt.recordedDate must be an ISO 8601 date (YYYY-MM-DD)"
        )
    if (
        not isinstance(prompt.get("promptOrObjective"), str)
        or not prompt["promptOrObjective"].strip()
    ):
        errors.append(f"{relative}: {issue_id} discussionPrompt.promptOrObjective is required")
    if prompt.get("scientificStatus") != DISCUSSION_PROMPT_SCIENTIFIC_STATUS:
        errors.append(
            f"{relative}: {issue_id} discussionPrompt.scientificStatus must be "
            f"{DISCUSSION_PROMPT_SCIENTIFIC_STATUS!r}"
        )
    if prompt.get("identityAssurance") != DISCUSSION_PROMPT_IDENTITY_ASSURANCE:
        errors.append(
            f"{relative}: {issue_id} discussionPrompt.identityAssurance must be "
            f"{DISCUSSION_PROMPT_IDENTITY_ASSURANCE!r}"
        )
    # The parent item retains its own provenance; discussionPrompt does not
    # introduce independent issueId/sourceId/sourceLocator.
    if not isinstance(item.get("issueId"), str) or not item["issueId"].strip():
        errors.append(f"{relative}: {issue_id} discussionPrompt requires the item's own issueId")
    if not isinstance(item.get("sourceId"), str) or not item["sourceId"].strip():
        errors.append(f"{relative}: {issue_id} discussionPrompt requires the item's own sourceId")
    if not isinstance(item.get("sourceLocator"), dict):
        errors.append(f"{relative}: {issue_id} discussionPrompt requires the item's own sourceLocator")
    # discussionPrompt must inherit provenance from its parent item, not
    # carry its own — a second, possibly conflicting issueId/sourceId/
    # sourceLocator on the same item would undermine that guarantee.
    for field in ("issueId", "sourceId", "sourceLocator"):
        if field in prompt:
            errors.append(
                f"{relative}: {issue_id} discussionPrompt must not define its own {field} "
                "(it inherits this from the parent remediation item)"
            )
    return errors


def find_chemfigure_attribute_pairs(body: str) -> list[dict[str, str]]:
    """Every `<ChemFigure ... />` tag's own attributes, as an independent
    dict per tag — order- and newline-insensitive (JSX attributes routinely
    span multiple lines in this codebase), and never conflates one tag's
    `src` with a different tag's `alt`."""
    pairs: list[dict[str, str]] = []
    for match in re.finditer(r"<ChemFigure\b[^>]*/?>", body):
        pairs.append(dict(re.findall(r'(\w+)="([^"]*)"', match.group(0))))
    return pairs


def validate_accepted_with_limitation(
    item: dict[str, Any],
    qa_unresolved_by_id: dict[str, dict[str, Any]],
    block_by_id: dict[str, dict[str, Any]],
    report_source_id: str | None,
    lesson_slug: str,
    lesson_topic: str,
    body: str,
    relative: str,
) -> list[str]:
    errors: list[str] = []
    issue_id = item.get("issueId", "?")
    choice = item.get("remediationChoice")
    decision = item.get("ownerDecision")
    if not isinstance(decision, dict):
        return [f"{relative}: {issue_id} accepted-with-limitation requires an ownerDecision object"]

    if item.get("lessonSlug") != lesson_slug:
        errors.append(
            f"{relative}: {issue_id} lessonSlug {item.get('lessonSlug')!r} differs from the "
            f"canonical lesson being validated ({lesson_slug!r})"
        )
    if item.get("topic") != lesson_topic:
        errors.append(
            f"{relative}: {issue_id} topic {item.get('topic')!r} differs from the canonical "
            f"lesson topic ({lesson_topic!r})"
        )

    if choice not in REMEDIATION_NEW_CHOICES:
        errors.append(
            f"{relative}: {issue_id} status accepted-with-limitation requires remediationChoice to be "
            f"one of {sorted(REMEDIATION_NEW_CHOICES)}, got {choice!r}"
        )
    expected_kind = REMEDIATION_CHOICE_KIND.get(choice)
    if expected_kind is not None and item.get("kind") != expected_kind:
        errors.append(
            f"{relative}: {issue_id} remediationChoice {choice!r} is only supported for kind "
            f"{expected_kind!r}, got {item.get('kind')!r}"
        )

    if not isinstance(decision.get("decidedBy"), str) or not decision["decidedBy"].strip():
        errors.append(f"{relative}: {issue_id} ownerDecision.decidedBy is required")
    if not is_iso_date(decision.get("decidedAt")):
        errors.append(
            f"{relative}: {issue_id} ownerDecision.decidedAt must be an ISO 8601 date (YYYY-MM-DD)"
        )
    if not isinstance(decision.get("qaNote"), str) or not decision["qaNote"].strip():
        errors.append(f"{relative}: {issue_id} ownerDecision.qaNote is required")
    for field in ("altText", "caption", "reviewedLatex"):
        if decision.get(field) is not None:
            errors.append(
                f"{relative}: {issue_id} ownerDecision.{field} must remain null for "
                f"an accepted-with-limitation disposition (no remediation payload was authored)"
            )

    unresolved = qa_unresolved_by_id.get(issue_id)
    if unresolved is None:
        errors.append(f"{relative}: {issue_id} accepted-with-limitation issue missing from QA unresolved")
    block = block_by_id.get(issue_id)
    if block is None:
        errors.append(f"{relative}: {issue_id} accepted-with-limitation issue missing from the failure report")

    if unresolved is not None and block is not None:
        severities = {item.get("severity"), unresolved.get("severity"), block.get("severity")}
        if len(severities) != 1:
            errors.append(
                f"{relative}: {issue_id} severity is inconsistent across the queue item, QA record "
                "and failure report"
            )
        messages = {item.get("message"), unresolved.get("description"), block.get("message")}
        if len(messages) != 1:
            errors.append(
                f"{relative}: {issue_id} message differs from the original QA/failure-report evidence"
            )
        if item.get("sourceLocator") != block.get("sourceLocator"):
            errors.append(
                f"{relative}: {issue_id} sourceLocator differs from the original failure-report evidence"
            )
        if item.get("issueCode") != block.get("issueCode"):
            errors.append(
                f"{relative}: {issue_id} issueCode {item.get('issueCode')!r} differs from the "
                f"failure report's {block.get('issueCode')!r}"
            )
        if item.get("kind") != block.get("kind"):
            errors.append(
                f"{relative}: {issue_id} kind {item.get('kind')!r} differs from the failure "
                f"report's {block.get('kind')!r}"
            )
    if report_source_id is not None and item.get("sourceId") != report_source_id:
        errors.append(
            f"{relative}: {issue_id} sourceId {item.get('sourceId')!r} differs from the failure "
            f"report's source {report_source_id!r}"
        )

    if choice == "owner-accepted-source-fidelity":
        anchor = (item.get("sourceLocator") or {}).get("textAnchor")
        if not isinstance(anchor, str) or not anchor.strip():
            errors.append(
                f"{relative}: {issue_id} owner-accepted-source-fidelity requires a non-empty "
                "sourceLocator.textAnchor"
            )
        else:
            normalized_anchor = re.sub(r"\s+", "", anchor)
            # Strip tags first: the DataTable's own <th>/<td> markup sits
            # between cell text nodes that textAnchor concatenates with no
            # separator, so whitespace-only normalization would never match.
            normalized_body = re.sub(r"\s+", "", re.sub(r"<[^>]+>", "", body))
            if normalized_anchor not in normalized_body:
                errors.append(
                    f"{relative}: {issue_id} source-fidelity evidence is not traceable in the canonical MDX"
                )
    elif choice == "owner-accepted-visible-fallback":
        # Locked to the ORIGINAL failure-evidence fallback, not merely to
        # some asset that happens to be referenced somewhere in the MDX:
        # the failure-report block's own fallback.assetPath/altText is the
        # source of truth, and the canonical MDX must pair both exactly on
        # one ChemFigure.
        fallback = block.get("fallback") if isinstance(block, dict) else None
        if not isinstance(fallback, dict):
            errors.append(
                f"{relative}: {issue_id} owner-accepted-visible-fallback requires the failure-report "
                "block to carry a fallback object"
            )
        asset_path = fallback.get("assetPath") if isinstance(fallback, dict) else None
        alt_text = fallback.get("altText") if isinstance(fallback, dict) else None
        if not isinstance(asset_path, str) or not asset_path.strip():
            errors.append(
                f"{relative}: {issue_id} failure-report fallback.assetPath is required for "
                "owner-accepted-visible-fallback"
            )
        if not isinstance(alt_text, str) or not alt_text.strip():
            errors.append(
                f"{relative}: {issue_id} failure-report fallback.altText is required for "
                "owner-accepted-visible-fallback"
            )
        preview = item.get("previewPath")
        if preview != asset_path:
            errors.append(
                f"{relative}: {issue_id} previewPath must exactly equal the failure report's "
                f"fallback.assetPath ({asset_path!r}), got {preview!r}"
            )
        if isinstance(asset_path, str) and isinstance(alt_text, str):
            paired = any(
                attrs.get("src") == asset_path and attrs.get("alt") == alt_text
                for attrs in find_chemfigure_attribute_pairs(body)
            )
            if not paired:
                errors.append(
                    f"{relative}: {issue_id} visible-fallback asset is not traceable to a single "
                    "canonical ChemFigure pairing the original fallback src and alt"
                )

    return errors


def validate_applied_image_fallback(
    item: dict[str, Any],
    qa_unresolved_by_id: dict[str, dict[str, Any]],
    block_by_id: dict[str, dict[str, Any]],
    report_source_id: str | None,
    lesson_slug: str,
    lesson_topic: str,
    body: str,
    relative: str,
) -> list[str]:
    """P6-B2.4B: `status: "applied"` + `remediationChoice:
    "reviewed-image-fallback"` — an Owner-approved visual replacement for a
    native, non-extractable drawing/shape, now live in the canonical MDX.
    See docs/contracts/content.md "Applied reviewed-image-fallback"."""
    errors: list[str] = []
    issue_id = item.get("issueId", "?")
    decision = item.get("ownerDecision")
    if not isinstance(decision, dict):
        return [f"{relative}: {issue_id} applied reviewed-image-fallback requires an ownerDecision object"]

    if item.get("lessonSlug") != lesson_slug:
        errors.append(
            f"{relative}: {issue_id} lessonSlug {item.get('lessonSlug')!r} differs from the "
            f"canonical lesson being validated ({lesson_slug!r})"
        )
    if item.get("topic") != lesson_topic:
        errors.append(
            f"{relative}: {issue_id} topic {item.get('topic')!r} differs from the canonical "
            f"lesson topic ({lesson_topic!r})"
        )
    if item.get("kind") not in REMEDIATION_APPLIED_IMAGE_FALLBACK_KINDS:
        errors.append(
            f"{relative}: {issue_id} applied reviewed-image-fallback is only supported for kind "
            f"in {sorted(REMEDIATION_APPLIED_IMAGE_FALLBACK_KINDS)}, got {item.get('kind')!r}"
        )

    if not isinstance(decision.get("decidedBy"), str) or not decision["decidedBy"].strip():
        errors.append(f"{relative}: {issue_id} ownerDecision.decidedBy is required")
    if not is_iso_date(decision.get("decidedAt")):
        errors.append(
            f"{relative}: {issue_id} ownerDecision.decidedAt must be an ISO 8601 date (YYYY-MM-DD)"
        )
    if not isinstance(decision.get("qaNote"), str) or not decision["qaNote"].strip():
        errors.append(f"{relative}: {issue_id} ownerDecision.qaNote is required")
    if decision.get("reviewedLatex") is not None:
        errors.append(
            f"{relative}: {issue_id} ownerDecision.reviewedLatex must remain null for "
            "reviewed-image-fallback (no LaTeX was authored)"
        )

    alt_text = decision.get("altText")
    caption = decision.get("caption")
    if not isinstance(alt_text, str) or not alt_text.strip():
        errors.append(
            f"{relative}: {issue_id} ownerDecision.altText is required for an applied "
            "reviewed-image-fallback disposition"
        )
    if not isinstance(caption, str) or not caption.strip():
        errors.append(
            f"{relative}: {issue_id} ownerDecision.caption is required for an applied "
            "reviewed-image-fallback disposition"
        )

    preview = item.get("previewPath")
    if not isinstance(preview, str) or not preview.strip():
        errors.append(
            f"{relative}: {issue_id} previewPath is required for an applied "
            "reviewed-image-fallback disposition"
        )
    elif isinstance(alt_text, str) and isinstance(caption, str):
        paired = any(
            attrs.get("src") == preview
            and attrs.get("alt") == alt_text
            and attrs.get("caption") == caption
            for attrs in find_chemfigure_attribute_pairs(body)
        )
        if not paired:
            errors.append(
                f"{relative}: {issue_id} applied replacement is not traceable to a single "
                "canonical ChemFigure pairing src/alt/caption exactly"
            )

    matching_callouts = [
        match.group(0)
        for match in re.finditer(r"<Callout\b[\s\S]*?</Callout>", body)
        if issue_id in match.group(0)
    ]
    if matching_callouts:
        errors.append(
            f"{relative}: {issue_id} is applied and must not remain a fallback Callout"
        )

    unresolved = qa_unresolved_by_id.get(issue_id)
    if unresolved is None:
        errors.append(f"{relative}: {issue_id} applied issue missing from QA unresolved")
    block = block_by_id.get(issue_id)
    if block is None:
        errors.append(f"{relative}: {issue_id} applied issue missing from the failure report")
    if unresolved is not None and block is not None:
        severities = {item.get("severity"), unresolved.get("severity"), block.get("severity")}
        if len(severities) != 1:
            errors.append(
                f"{relative}: {issue_id} severity is inconsistent across the queue item, QA record "
                "and failure report"
            )
        if item.get("sourceLocator") != block.get("sourceLocator"):
            errors.append(
                f"{relative}: {issue_id} sourceLocator differs from the original failure-report evidence"
            )
        if item.get("issueCode") != block.get("issueCode"):
            errors.append(
                f"{relative}: {issue_id} issueCode {item.get('issueCode')!r} differs from the "
                f"failure report's {block.get('issueCode')!r}"
            )
        if item.get("kind") != block.get("kind"):
            errors.append(
                f"{relative}: {issue_id} kind {item.get('kind')!r} differs from the failure "
                f"report's {block.get('kind')!r}"
            )
    if report_source_id is not None and item.get("sourceId") != report_source_id:
        errors.append(
            f"{relative}: {issue_id} sourceId {item.get('sourceId')!r} differs from the failure "
            f"report's source {report_source_id!r}"
        )

    return errors


def validate_remediation_queue(
    queue: list[dict[str, Any]],
    qa: dict[str, Any],
    report: dict[str, Any],
    lesson_slug: str,
    lesson_topic: str,
    body: str,
    relative: str,
) -> list[str]:
    errors: list[str] = []
    qa_unresolved_by_id = {issue.get("id"): issue for issue in qa.get("unresolved", [])}
    block_by_id = {block.get("id"): block for block in report.get("blocks", [])}
    report_source_id = report.get("source", {}).get("sourceId")

    for item in queue:
        issue_id = item.get("issueId", "?")
        status = item.get("status")
        choice = item.get("remediationChoice")
        # Checked for every item, not only accepted-with-limitation ones: a
        # new choice paired with any other status is invalid regardless of
        # which side of the pair was edited.
        if choice in REMEDIATION_NEW_CHOICES and status != REMEDIATION_NEW_STATUS:
            errors.append(
                f"{relative}: {issue_id} remediationChoice {choice!r} requires status "
                f"{REMEDIATION_NEW_STATUS!r}, got {status!r}"
            )
        if status == REMEDIATION_NEW_STATUS:
            errors.extend(
                validate_accepted_with_limitation(
                    item,
                    qa_unresolved_by_id,
                    block_by_id,
                    report_source_id,
                    lesson_slug,
                    lesson_topic,
                    body,
                    relative,
                )
            )
        if (
            status == REMEDIATION_APPLIED_STATUS
            and choice == REMEDIATION_APPLIED_IMAGE_FALLBACK_CHOICE
        ):
            errors.extend(
                validate_applied_image_fallback(
                    item,
                    qa_unresolved_by_id,
                    block_by_id,
                    report_source_id,
                    lesson_slug,
                    lesson_topic,
                    body,
                    relative,
                )
            )
        errors.extend(validate_discussion_prompt(item, relative))
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

            # P6-B1.3P: optional per-lesson remediation queue, validated only
            # for the new accepted-with-limitation vocabulary (and any
            # discussionPrompt); every legacy status/choice value is left
            # exactly as unvalidated as before.
            queue_path = root / f"content/qa/pending/{slug}.remediation-queue.json"
            if queue_path.is_file():
                queue = read_json(queue_path)
                errors.extend(
                    validate_remediation_queue(queue, qa, report, slug, topic, body, relative)
                )

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
