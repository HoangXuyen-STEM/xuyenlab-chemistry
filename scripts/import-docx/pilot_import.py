#!/usr/bin/env python3
"""Generate deterministic, incremental Part I review drafts and staging assets.

The importer never claims chemical correctness and never emits ``published``.
Existing managed output is overwritten only when it still matches the previous
manifest. A manually edited file requires both ``--force`` and ``--backup-dir``.
Without explicit source arguments it retains the legacy Topic 6/8 fixture mode.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[2]
PROTOTYPE_PATH = Path(__file__).with_name("prototype.py")
PILOTS = (
    {
        "source_id": "T06-S01",
        "topic": 6,
        "source": "6. Chuyen de 6. Dong hoa hoc.ok.docx",
        "slug": "dong-hoa-hoc",
        "title": "Động hóa học",
    },
    {
        "source_id": "T08-S01",
        "topic": 8,
        "source": "8.1. Chuyen de 8-  Dung dich can bang hoa hoc- phan I & II OK (1).docx",
        "slug": "dung-dich-va-can-bang-hoa-hoc",
        "title": "Dung dịch và cân bằng hóa học",
    },
)
MANIFEST_PATH = Path("content/pilot-staging-manifest.json")
PRETTIER = REPO_ROOT / "node_modules/.bin/prettier"


def source_search_roots() -> list[Path]:
    roots = [REPO_ROOT / "_workspace", REPO_ROOT]
    extra = os.environ.get("XUYENLAB_SOURCE_ROOT")
    if extra:
        roots.append(Path(extra).expanduser())
    return roots


def resolve_word_source(source: str | Path) -> Path:
    given = Path(source)
    if given.is_file():
        return given.resolve()
    relatives = []
    if not given.is_absolute():
        relatives.append(given)
    relatives.append(Path(given.name))
    seen: set[Path] = set()
    for root in source_search_roots():
        for relative in relatives:
            candidate = (root / relative).resolve()
            if candidate in seen:
                continue
            seen.add(candidate)
            if candidate.is_file():
                return candidate
    raise FileNotFoundError(given)


def manifest_source_path(resolved: Path) -> str:
    workspace = (REPO_ROOT / "_workspace").resolve()
    try:
        resolved.relative_to(workspace)
        return resolved.name
    except ValueError:
        pass
    extra = os.environ.get("XUYENLAB_SOURCE_ROOT")
    if extra:
        try:
            resolved.relative_to(Path(extra).expanduser().resolve())
            return resolved.name
        except ValueError:
            pass
    try:
        return resolved.relative_to(REPO_ROOT).as_posix()
    except ValueError:
        return resolved.name


def digest(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()


def file_hash(path: Path) -> str:
    return digest(path.read_bytes())


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def prettier(value: str, parser: str) -> bytes:
    if not PRETTIER.is_file():
        raise FileNotFoundError(
            "node_modules/.bin/prettier is required; install locked npm dependencies first"
        )
    result = subprocess.run(
        [str(PRETTIER), "--parser", parser],
        cwd=REPO_ROOT,
        input=value,
        capture_output=True,
        text=True,
        check=True,
    )
    return result.stdout.encode()


def run_prototype(pilot: dict[str, Any], output_root: Path) -> Path:
    result = subprocess.run(
        [
            "python3",
            str(PROTOTYPE_PATH),
            "--source",
            str(resolve_word_source(pilot["source"])),
            "--source-id",
            pilot["source_id"],
            "--topic",
            str(pilot["topic"]),
            "--slug",
            pilot["slug"],
            "--title",
            pilot["title"],
            "--output-dir",
            str(output_root),
        ],
        cwd=REPO_ROOT,
        check=True,
        capture_output=True,
        text=True,
        env={"PYTHONDONTWRITEBYTECODE": "1"},
    )
    return Path(json.loads(result.stdout)["target"])


def remediation_queue(
    report: dict[str, Any], source_id: str, topic_slug: str, lesson_slug: str
) -> list[dict[str, Any]]:
    """Build a review queue without inferring chemistry or object semantics."""
    observed_types = {
        "formula": ("formula", "Native OOXML formula markup requires Owner review."),
        "table": ("table", "DOCX table was extracted as a DataTable and requires visual review."),
        "image": ("figure", "Browser-safe raster image was extracted from the DOCX relationship."),
        "drawing": ("unknown", "Drawing has no safe semantic classification from the importer."),
        "embeddedObject": (
            "unknown",
            "Embedded object type and chemical meaning are not inferred by the importer.",
        ),
    }
    queue: list[dict[str, Any]] = []
    for block in report["blocks"]:
        if block["outcome"] == "semantic":
            continue
        observed_type, evidence = observed_types.get(
            block["kind"],
            ("unknown", "No safe object classification is available from source structure."),
        )
        fallback = block.get("fallback", {})
        preview_path = fallback.get("assetPath") if observed_type == "figure" else None
        queue.append(
            {
                "issueId": block["id"],
                "sourceId": source_id,
                "topic": topic_slug,
                "lessonSlug": lesson_slug,
                "sourceLocator": block["sourceLocator"],
                "issueCode": block["issueCode"],
                "kind": block["kind"],
                "severity": block["severity"],
                "message": block["message"],
                "observedType": observed_type,
                "observedTypeEvidence": evidence,
                "previewPath": preview_path,
                "status": "pending-owner-review",
                "remediationChoice": None,
                "ownerDecision": {
                    "decidedBy": None,
                    "decidedAt": None,
                    "altText": None,
                    "caption": None,
                    "reviewedLatex": None,
                    "qaNote": None,
                },
            }
        )
    return queue


def build_outputs(pilots: tuple[dict[str, Any], ...]) -> tuple[dict[str, bytes], dict[str, Any]]:
    outputs: dict[str, bytes] = {}
    lessons: list[dict[str, Any]] = []
    assets: dict[str, dict[str, Any]] = {}
    with tempfile.TemporaryDirectory(prefix="xuyenlab-p4-import-") as temp_name:
        temp_root = Path(temp_name)
        for pilot in pilots:
            generated = run_prototype(pilot, temp_root)
            report = load_json(generated / "failure-report.json")
            report["generator"] = {
                "name": "xuyenlab-hybrid-pilot-importer",
                "version": "0.3.0",
                "strategy": "hybrid",
            }
            mdx_path = generated / f"{pilot['slug']}.mdx"
            mdx = mdx_path.read_text(encoding="utf-8")
            mdx = mdx.replace("Phần I conversion spike", "Phần I")
            mdx = mdx.replace("conversion-spike", "pilot-draft")
            mdx = mdx.replace(
                "Bản nháp tự động để đánh giá chiến lược chuyển đổi; chưa được QA hóa học.",
                "Bản nháp pilot Phần I; mọi công thức, bảng và hình vẫn chờ Chủ dự án QA.",
            )

            for asset in sorted((generated / "assets").glob("*")) if (generated / "assets").exists() else ():
                asset_digest = file_hash(asset)
                if asset.stem != asset_digest:
                    raise ValueError(f"Asset is not named by its full SHA-256: {asset.name}")
                public_path = f"staging-assets/lessons/{asset_digest[:2]}/{asset.name}"
                outputs[f"public/{public_path}"] = asset.read_bytes()
                assets[public_path] = {
                    "sha256": asset_digest,
                    "bytes": asset.stat().st_size,
                    "sourceIds": sorted(
                        set(assets.get(public_path, {}).get("sourceIds", []))
                        | {pilot["source_id"]}
                    ),
                }
                mdx = mdx.replace(f"./assets/{asset.name}", f"/{public_path}")
                for block in report["blocks"]:
                    fallback = block.get("fallback", {})
                    if fallback.get("assetPath") == f"assets/{asset.name}":
                        fallback["assetPath"] = f"/{public_path}"

            topic_slug = f"chuyen-de-{pilot['topic']:02d}"
            lesson_path = f"content/topics/{topic_slug}/{pilot['slug']}.mdx"
            report_path = f"content/qa/import-reports/{pilot['slug']}.failure.json"
            qa_path = f"content/qa/pending/{pilot['slug']}.json"
            remediation_path = f"content/qa/pending/{pilot['slug']}.remediation-queue.json"
            outputs[lesson_path] = prettier(mdx, "mdx")
            outputs[report_path] = prettier(
                json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True), "json"
            )

            unresolved = [
                {
                    "id": block["id"],
                    "severity": block["severity"],
                    "description": block["message"],
                }
                for block in report["blocks"]
                if block["outcome"] != "semantic"
            ]
            qa = {
                "lessonSlug": pilot["slug"],
                "lessonVersion": 1,
                "sourceIds": [pilot["source_id"]],
                "reviewStatus": "pending",
                "reviewer": None,
                "reviewedAt": None,
                "checks": {
                    "scopePartIOnly": False,
                    "chemistryVerified": False,
                    "formulasVerified": False,
                    "tablesVerified": False,
                    "figuresVerified": False,
                    "mobileVerified": False,
                    "printVerified": False,
                },
                "unresolved": unresolved,
                "approvedForPublish": False,
            }
            outputs[qa_path] = prettier(
                json.dumps(qa, ensure_ascii=False, indent=2, sort_keys=True), "json"
            )
            outputs[remediation_path] = prettier(
                json.dumps(
                    remediation_queue(
                        report, pilot["source_id"], topic_slug, pilot["slug"]
                    ),
                    ensure_ascii=False,
                    indent=2,
                    sort_keys=True,
                ),
                "json",
            )
            lessons.append(
                {
                    "slug": pilot["slug"],
                    "topic": topic_slug,
                    "sourceId": pilot["source_id"],
                    "sourcePath": pilot["source"],
                    "sourceSha256": report["run"]["sourceDigest"].removeprefix("sha256:"),
                    "mdxPath": lesson_path,
                    "failureReportPath": report_path,
                    "qaPath": qa_path,
                    "blockingCount": report["summary"]["blockingCount"],
                    "warningCount": report["summary"]["warningCount"],
                    # Importers create drafts only. The incremental installer preserves
                    # unrelated entries, and refuse_if_target_in_review prevents a
                    # requested reviewed lesson from being regenerated, even with force.
                    "status": "draft",
                }
            )

    manifest = {
        "manifestVersion": "1.1.0",
        "strategy": "hybrid",
        "scope": "Part I only",
        "lessons": lessons,
        "assets": [dict(path=path, **metadata) for path, metadata in sorted(assets.items())],
    }
    for lesson in manifest["lessons"]:
        lesson["mdxSha256"] = digest(outputs[lesson["mdxPath"]])
        lesson["failureReportSha256"] = digest(outputs[lesson["failureReportPath"]])
        lesson["qaSha256"] = digest(outputs[lesson["qaPath"]])
    return outputs, manifest


def refuse_if_target_in_review(
    target_root: Path, requested: tuple[dict[str, Any], ...]
) -> None:
    """Never regenerate a requested lesson after Owner review has started."""
    manifest_file = target_root / MANIFEST_PATH
    if not manifest_file.exists():
        return
    previous = load_json(manifest_file)
    requested_slugs = {item["slug"] for item in requested}
    in_review = sorted(
        lesson["slug"]
        for lesson in previous.get("lessons", [])
        if lesson.get("status") == "in_review" and lesson.get("slug") in requested_slugs
    )
    if in_review:
        raise PermissionError(
            "Refusing to run: requested manifest lesson(s) "
            f"{in_review} are in_review. The importer would regenerate them as "
            "unsigned drafts, erasing their QA/approvedForPublish/publishWaiver "
            "state. This is not bypassable with --force."
        )


def install_incremental(
    target_root: Path,
    outputs: dict[str, bytes],
    generated: dict[str, Any],
    force: bool,
    backup_dir: Path | None,
) -> str:
    """Merge only requested lessons/assets into the staging manifest."""
    previous_manifest_file = target_root / MANIFEST_PATH
    previous: dict[str, Any] = {
        "manifestVersion": "1.1.0",
        "strategy": "hybrid",
        "scope": "Part I only",
        "lessons": [],
        "assets": [],
    }
    if previous_manifest_file.exists():
        previous = load_json(previous_manifest_file)
    if previous.get("manifestVersion") != "1.1.0":
        raise ValueError("Existing manifest must use manifestVersion 1.1.0")
    if previous.get("strategy") != "hybrid":
        raise ValueError("Existing manifest must use the hybrid strategy")

    generated_lessons = generated["lessons"]
    requested_slugs = {lesson["slug"] for lesson in generated_lessons}
    requested_source_ids = {lesson["sourceId"] for lesson in generated_lessons}
    requested_paths = {lesson["mdxPath"] for lesson in generated_lessons}
    for lesson in previous.get("lessons", []):
        collides = (
            lesson.get("slug") in requested_slugs
            or lesson.get("sourceId") in requested_source_ids
            or lesson.get("mdxPath") in requested_paths
        )
        if collides and not (
            lesson.get("slug") in requested_slugs
            and lesson.get("sourceId") in requested_source_ids
            and lesson.get("mdxPath") in requested_paths
        ):
            raise ValueError(
                "Requested lesson identity collides with a different existing "
                f"manifest entry: {lesson.get('slug')!r}"
            )

    replaced_lessons = [
        lesson for lesson in previous.get("lessons", []) if lesson.get("slug") in requested_slugs
    ]
    expected_previous: dict[str, str] = {}
    for lesson in replaced_lessons:
        expected_previous[lesson["mdxPath"]] = lesson["mdxSha256"]
        expected_previous[lesson["failureReportPath"]] = lesson["failureReportSha256"]
        expected_previous[lesson["qaPath"]] = lesson["qaSha256"]
    for asset in previous.get("assets", []):
        if set(asset.get("sourceIds", [])) & requested_source_ids:
            expected_previous[f"public/{asset['path']}"] = asset["sha256"]

    actual_previous = {
        path: file_hash(target_root / path)
        for path in expected_previous
        if (target_root / path).is_file()
    }
    drift = {
        path: {"expected": expected_previous.get(path), "actual": actual_previous.get(path)}
        for path in sorted(set(expected_previous) | set(actual_previous))
        if expected_previous.get(path) != actual_previous.get(path)
    }
    for lesson in replaced_lessons:
        queue_path = f"content/qa/pending/{lesson['slug']}.remediation-queue.json"
        queue_file = target_root / queue_path
        proposed = outputs.get(queue_path)
        if queue_file.is_file() and proposed is not None and queue_file.read_bytes() != proposed:
            drift[queue_path] = {
                "expected": "deterministic generated queue",
                "actual": file_hash(queue_file),
            }
    diff_file = target_root / "content/pilot-import.diff.json"
    if drift:
        diff_file.parent.mkdir(parents=True, exist_ok=True)
        diff_file.write_text(json.dumps({"manualDrift": drift}, indent=2) + "\n", encoding="utf-8")
        if not force or backup_dir is None:
            raise FileExistsError(
                f"Manual edits detected; inspect {diff_file}. Rerun with --force and --backup-dir."
            )
        backup_dir.mkdir(parents=True, exist_ok=True)
        for path in drift:
            source = target_root / path
            if source.is_file():
                backup = backup_dir / path
                backup.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(source, backup)

    preserved_lessons = [
        lesson for lesson in previous.get("lessons", []) if lesson.get("slug") not in requested_slugs
    ]
    lessons = sorted(
        [*preserved_lessons, *generated_lessons],
        key=lambda lesson: (lesson["topic"], lesson["slug"]),
    )

    assets_by_path: dict[str, dict[str, Any]] = {}
    stale_asset_paths: set[str] = set()
    for asset in previous.get("assets", []):
        remaining_sources = sorted(set(asset.get("sourceIds", [])) - requested_source_ids)
        if remaining_sources:
            assets_by_path[asset["path"]] = dict(asset, sourceIds=remaining_sources)
        elif set(asset.get("sourceIds", [])) & requested_source_ids:
            stale_asset_paths.add(f"public/{asset['path']}")
        else:
            assets_by_path[asset["path"]] = asset
    for asset in generated.get("assets", []):
        current = assets_by_path.get(asset["path"])
        if current and (
            current.get("sha256") != asset.get("sha256")
            or current.get("bytes") != asset.get("bytes")
        ):
            raise ValueError(f"Asset metadata collision for {asset['path']}")
        merged_sources = sorted(
            set(current.get("sourceIds", []) if current else [])
            | set(asset.get("sourceIds", []))
        )
        assets_by_path[asset["path"]] = dict(asset, sourceIds=merged_sources)
        stale_asset_paths.discard(f"public/{asset['path']}")

    manifest = {
        "manifestVersion": "1.1.0",
        "strategy": "hybrid",
        "scope": previous.get("scope", "Part I only"),
        "lessons": lessons,
        "assets": [assets_by_path[path] for path in sorted(assets_by_path)],
    }
    changed = False
    for stale_path in sorted(stale_asset_paths):
        stale = target_root / stale_path
        if stale.is_file():
            stale.unlink()
            changed = True
    for path, payload in outputs.items():
        destination = target_root / path
        if not destination.exists() or destination.read_bytes() != payload:
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_bytes(payload)
            changed = True
    manifest_payload = prettier(
        json.dumps(manifest, ensure_ascii=False, indent=2, sort_keys=True), "json"
    )
    manifest_file = target_root / MANIFEST_PATH
    if not manifest_file.exists() or manifest_file.read_bytes() != manifest_payload:
        manifest_file.parent.mkdir(parents=True, exist_ok=True)
        manifest_file.write_bytes(manifest_payload)
        changed = True
    if diff_file.exists() and not drift:
        diff_file.unlink()
    return "updated" if changed else "unchanged"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--target-root", type=Path, default=REPO_ROOT)
    parser.add_argument("--source", type=Path)
    parser.add_argument("--source-id")
    parser.add_argument("--topic", type=int, choices=range(1, 27))
    parser.add_argument("--slug")
    parser.add_argument("--title")
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--backup-dir", type=Path)
    return parser.parse_args()


def requested_lessons(args: argparse.Namespace) -> tuple[dict[str, Any], ...]:
    explicit = (args.source, args.source_id, args.topic, args.slug, args.title)
    if not any(value is not None for value in explicit):
        return PILOTS
    if not all(value is not None for value in explicit):
        raise ValueError(
            "--source, --source-id, --topic, --slug and --title must be supplied together"
        )
    source = resolve_word_source(args.source)
    source_path = manifest_source_path(source)
    return (
        {
            "source_id": args.source_id,
            "topic": args.topic,
            "source": source_path,
            "slug": args.slug,
            "title": args.title,
        },
    )


def main() -> int:
    args = parse_args()
    if args.force and args.backup_dir is None:
        raise ValueError("--force requires an explicit --backup-dir")
    target_root = args.target_root.resolve()
    target_root.mkdir(parents=True, exist_ok=True)
    requested = requested_lessons(args)
    refuse_if_target_in_review(target_root, requested)
    outputs, manifest = build_outputs(requested)
    result = install_incremental(
        target_root, outputs, manifest, args.force, args.backup_dir
    )
    print(json.dumps({"result": result, "manifest": str(target_root / MANIFEST_PATH)}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
