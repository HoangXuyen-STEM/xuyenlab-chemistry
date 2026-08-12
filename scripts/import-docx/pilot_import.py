#!/usr/bin/env python3
"""Generate deterministic Topic 6/8 review drafts and staging assets.

The importer never claims chemical correctness and never emits ``published``.
Existing managed output is overwritten only when it still matches the previous
manifest. A manually edited file requires both ``--force`` and ``--backup-dir``.
"""

from __future__ import annotations

import argparse
import hashlib
import json
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
            str(REPO_ROOT / pilot["source"]),
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


def build_outputs() -> tuple[dict[str, bytes], dict[str, Any]]:
    outputs: dict[str, bytes] = {}
    lessons: list[dict[str, Any]] = []
    assets: dict[str, dict[str, Any]] = {}
    with tempfile.TemporaryDirectory(prefix="xuyenlab-p4-import-") as temp_name:
        temp_root = Path(temp_name)
        for pilot in PILOTS:
            generated = run_prototype(pilot, temp_root)
            report = load_json(generated / "failure-report.json")
            report["generator"] = {
                "name": "xuyenlab-hybrid-pilot-importer",
                "version": "0.2.0",
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
                }
            )

    manifest = {
        "manifestVersion": "1.0.0",
        "strategy": "hybrid",
        "scope": "Part I only",
        "publicationStatus": "draft",
        "lessons": lessons,
        "assets": [dict(path=path, **metadata) for path, metadata in sorted(assets.items())],
    }
    for lesson in manifest["lessons"]:
        lesson["mdxSha256"] = digest(outputs[lesson["mdxPath"]])
        lesson["failureReportSha256"] = digest(outputs[lesson["failureReportPath"]])
        lesson["qaSha256"] = digest(outputs[lesson["qaPath"]])
    return outputs, manifest


def previous_managed_hashes(target_root: Path) -> dict[str, str]:
    manifest_file = target_root / MANIFEST_PATH
    if not manifest_file.exists():
        return {}
    manifest = load_json(manifest_file)
    paths = [
        path
        for lesson in manifest.get("lessons", [])
        for path in (lesson["mdxPath"], lesson["failureReportPath"], lesson["qaPath"])
    ] + [f"public/{asset['path']}" for asset in manifest.get("assets", [])]
    return {
        path: file_hash(target_root / path)
        for path in paths
        if (target_root / path).is_file()
    }


def install(
    target_root: Path,
    outputs: dict[str, bytes],
    manifest: dict[str, Any],
    force: bool,
    backup_dir: Path | None,
) -> str:
    previous_manifest_file = target_root / MANIFEST_PATH
    expected_previous: dict[str, str] = {}
    if previous_manifest_file.exists():
        previous = load_json(previous_manifest_file)
        for lesson in previous.get("lessons", []):
            expected_previous[lesson["mdxPath"]] = lesson["mdxSha256"]
            expected_previous[lesson["failureReportPath"]] = lesson["failureReportSha256"]
            expected_previous[lesson["qaPath"]] = lesson["qaSha256"]
        for asset in previous.get("assets", []):
            expected_previous[f"public/{asset['path']}"] = asset["sha256"]

    actual_previous = previous_managed_hashes(target_root)
    drift = {
        path: {"expected": expected_previous.get(path), "actual": actual_previous.get(path)}
        for path in sorted(set(expected_previous) | set(actual_previous))
        if expected_previous.get(path) != actual_previous.get(path)
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

    changed = False
    desired_paths = set(outputs)
    for stale_path in sorted(set(expected_previous) - desired_paths):
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
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--backup-dir", type=Path)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if args.force and args.backup_dir is None:
        raise ValueError("--force requires an explicit --backup-dir")
    target_root = args.target_root.resolve()
    target_root.mkdir(parents=True, exist_ok=True)
    outputs, manifest = build_outputs()
    result = install(target_root, outputs, manifest, args.force, args.backup_dir)
    print(json.dumps({"result": result, "manifest": str(target_root / MANIFEST_PATH)}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
