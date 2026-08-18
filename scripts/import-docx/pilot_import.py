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
