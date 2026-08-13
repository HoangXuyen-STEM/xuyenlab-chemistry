"""
Generate docs/qa/p4-remediation-queue*.md deterministically from the
committed content/qa/pending/*.remediation-queue.json files (docs/qa/tools/README.md).

Re-run any time those JSON files change (e.g. after recording owner
decisions) so the docs never drift from the data. Not part of the build.

Run from the repository root:
  python3 docs/qa/tools/generate_docs.py
"""
import json
from pathlib import Path

REPO_ROOT = Path.cwd()
QA_DIR = REPO_ROOT / "docs" / "qa"

LESSONS = [
    {
        "topic": "chuyen-de-06",
        "topicTitle": "Chuyên đề 6 · Động hóa học",
        "lessonSlug": "dong-hoa-hoc",
        "queue": REPO_ROOT / "content/qa/pending/dong-hoa-hoc.remediation-queue.json",
    },
    {
        "topic": "chuyen-de-08",
        "topicTitle": "Chuyên đề 8 · Dung dịch và cân bằng hóa học",
        "lessonSlug": "dung-dich-va-can-bang-hoa-hoc",
        "queue": REPO_ROOT / "content/qa/pending/dung-dich-va-can-bang-hoa-hoc.remediation-queue.json",
    },
]

SAMPLE_IDS = [
    "T06-S01:e6259", "T06-S01:e5248", "T06-S01:e4743", "T06-S01:e9544",
    "T08-S01:e7414", "T08-S01:e3055", "T08-S01:e6352",
]

TYPE_LABEL = {
    "formula": "Công thức",
    "table": "Bảng",
    "figure": "Hình",
    "diagram": "Sơ đồ",
    "unknown": "Chưa xác định",
}

SEVERITY_LABEL = {"blocking": "🔴 Chặn xuất bản", "warning": "🟡 Cảnh báo"}


def md_escape(text: str) -> str:
    # Escape angle brackets so raw XML fragments like <o:OLEObject ...> in the
    # evidence text can't be parsed as (unclosed) HTML tags by a Markdown
    # renderer, which would otherwise swallow/garble the rest of a table row.
    text = (text or "").replace("\n", " ")
    text = text.replace("<", "&lt;").replace(">", "&gt;")
    return text.replace("|", "\\|")


def decision_cell(item: dict) -> str:
    choice = item.get("remediationChoice")
    if not choice:
        return ""
    owner_decision = item.get("ownerDecision") or {}
    if choice == "reviewed-latex-mdx":
        latex = owner_decision.get("reviewedLatex")
        return md_escape(f"`{choice}`: {latex}" if latex else choice)
    if choice == "reviewed-image-fallback":
        alt = owner_decision.get("altText")
        return md_escape(f"`{choice}`: alt=\"{alt}\"" if alt else choice)
    return md_escape(choice)


def item_row(item: dict) -> str:
    preview = (
        f"[Xem preview]({item['previewPath']})"
        if item["previewPath"]
        else "_(không có preview)_"
    )
    evidence = md_escape(item["observedTypeEvidence"])
    if len(evidence) > 220:
        evidence = evidence[:220] + "…"
    return (
        f"| `{item['issueId']}` | {SEVERITY_LABEL[item['severity']]} "
        f"| {TYPE_LABEL[item['observedType']]} | {preview} "
        f"| {item['sourceLocator']['pathHint']} "
        f"| {evidence} | {item['status']} | {decision_cell(item)}|"
    )


def build_sample_section(all_items_by_id: dict) -> str:
    lines = [
        "## 7 issue mẫu — kiểm tra trước",
        "",
        "Bảy issue này được liệt kê tường minh trong yêu cầu triage; xem trước để",
        "hiểu quy trình trước khi đọc bảng đầy đủ bên dưới.",
        "",
    ]
    for issue_id in SAMPLE_IDS:
        item = all_items_by_id[issue_id]
        lines.append(f"### `{issue_id}`")
        lines.append("")
        lines.append(f"- **Nguồn:** `{item['sourceId']}` · **Mức độ:** {SEVERITY_LABEL[item['severity']]}")
        lines.append(f"- **issueCode:** `{item['issueCode']}` · **kind:** `{item['kind']}`")
        lines.append(f"- **Vị trí:** `{item['sourceLocator']['pathHint']}`")
        lines.append(f"- **Loại quan sát được:** {TYPE_LABEL[item['observedType']]}")
        lines.append(f"- **Căn cứ:** {md_escape(item['observedTypeEvidence'])}")
        lines.append(f"- **Trạng thái:** `{item['status']}`")
        decision = decision_cell(item)
        if decision:
            lines.append(f"- **Quyết định:** {decision}")
        if item["previewPath"]:
            lines.append("")
            lines.append(f"  ![preview]({item['previewPath']})")
        lines.append("")
    return "\n".join(lines)


def build_index(lessons_data: list[dict], all_items_by_id: dict) -> str:
    total = sum(len(d["items"]) for d in lessons_data)
    total_blocking = sum(
        sum(1 for i in d["items"] if i["severity"] == "blocking") for d in lessons_data
    )
    total_warning = sum(
        sum(1 for i in d["items"] if i["severity"] == "warning") for d in lessons_data
    )

    lines = [
        "# P4 remediation queue — Chuyên đề 6 & 8",
        "",
        "- Status: Draft triage data for the project owner (P4.4). Nothing here",
        "  changes a lesson's `draft` status, chemical content, or the underlying",
        "  `content/qa/pending/*.json` QA records.",
        "- Generated from `content/qa/pending/*.remediation-queue.json`, which is",
        "  itself generated read-only from the two source `.docx` files and the",
        "  P4.1 failure reports. See",
        "  `docs/handoffs/P4/P4.4-remediation-triage-claude.md` for exact",
        "  reproduction commands.",
        "",
        "## How to use this queue",
        "",
        "1. Read the **7 sample issues** below first — they walk through what",
        "   `observedType`/`observedTypeEvidence`/preview mean using real examples.",
        "2. Open the full per-topic table and, for each row, decide one of:",
        "   - `reviewed-latex-mdx` — the content should become real KaTeX/mhchem",
        "     (a separate content task then does the actual conversion);",
        "   - `reviewed-image-fallback` — a reviewed image is the right fallback",
        "     (a separate task adds a real `ChemFigure`, not the QA preview image);",
        "   - `remain-blocking` — leave it blocking for now (e.g. still unclear).",
        "3. Record the decision, alt text/caption (if `reviewed-image-fallback`)",
        "   and any QA note directly in the matching",
        "   `content/qa/pending/<lesson>.remediation-queue.json` entry's",
        "   `ownerDecision` object. This queue file does not itself unblock",
        "   publication — `docs/contracts/content.md`'s `LessonQaRecord` in",
        "   `content/qa/pending/<lesson>.json` is still the record that must be",
        "   completed and signed before a lesson can move to `in_review`.",
        "",
        f"## Summary",
        "",
        f"| | Blocking | Warning | Total |",
        f"| --- | ---: | ---: | ---: |",
    ]
    for d in lessons_data:
        b = sum(1 for i in d["items"] if i["severity"] == "blocking")
        w = sum(1 for i in d["items"] if i["severity"] == "warning")
        lines.append(f"| {d['topicTitle']} | {b} | {w} | {b + w} |")
    lines.append(f"| **Tổng** | **{total_blocking}** | **{total_warning}** | **{total}** |")
    lines.append("")

    lines.append("### Theo loại object quan sát được")
    lines.append("")
    lines.append("| Loại | Chuyên đề 6 | Chuyên đề 8 | Tổng |")
    lines.append("| --- | ---: | ---: | ---: |")
    from collections import Counter
    for t in ["formula", "diagram", "table", "figure", "unknown"]:
        c6 = sum(1 for i in lessons_data[0]["items"] if i["observedType"] == t)
        c8 = sum(1 for i in lessons_data[1]["items"] if i["observedType"] == t)
        lines.append(f"| {TYPE_LABEL[t]} (`{t}`) | {c6} | {c8} | {c6 + c8} |")
    lines.append("")

    lines.append("### Chi tiết theo Chuyên đề")
    lines.append("")
    for d in lessons_data:
        lines.append(f"- [{d['topicTitle']}](./p4-remediation-queue-{d['topic']}.md) "
                      f"— {len(d['items'])} mục")
    lines.append("")

    lines.append(build_sample_section(all_items_by_id))

    lines.append("## Ranh giới")
    lines.append("")
    lines.append("- Không có nội dung Hóa học nào bị sửa để tạo tài liệu này.")
    lines.append("- Không có ID hoặc mức độ (severity) nào bị xoá hay hạ cấp; xem")
    lines.append("  `tests/content/remediation-queue.test.ts` để kiểm chứng tự động.")
    lines.append("- Ảnh preview chỉ dùng để Owner xem trước, **chưa** phải fallback")
    lines.append("  publish — xem `public/qa-preview/README.md`.")
    lines.append("")

    return "\n".join(lines) + "\n"


def build_topic_doc(data: dict) -> str:
    items = data["items"]
    lines = [
        f"# P4 remediation queue — {data['topicTitle']}",
        "",
        f"`{len(items)}` mục — nguồn: `{items[0]['sourceId']}` · lesson slug:",
        f"`{data['lessonSlug']}` (`content/topics/{data['topic']}/{data['lessonSlug']}.mdx`,",
        "**không bị sửa nội dung** bởi tài liệu này).",
        "",
        "Nhóm theo loại object quan sát được, sắp theo thứ tự xuất hiện trong",
        "tài liệu (`blockOrder`). Cột **Quyết định** để trống — Oldman ghi lựa",
        "chọn (`reviewed-latex-mdx` / `reviewed-image-fallback` / `remain-blocking`)",
        f"trực tiếp vào `content/qa/pending/{data['lessonSlug']}.remediation-queue.json`.",
        "",
    ]

    from collections import defaultdict
    by_type: dict[str, list] = defaultdict(list)
    for item in items:
        by_type[item["observedType"]].append(item)

    for t in ["formula", "diagram", "table", "figure", "unknown"]:
        group = sorted(by_type.get(t, []), key=lambda i: i["sourceLocator"]["blockOrder"])
        if not group:
            continue
        lines.append(f"## {TYPE_LABEL[t]} (`{t}`) — {len(group)} mục")
        lines.append("")
        lines.append("| issueId | Mức độ | Preview | Vị trí (pathHint) | Căn cứ | Trạng thái | Quyết định |")
        lines.append("| --- | --- | --- | --- | --- | --- | --- |")
        for item in group:
            lines.append(item_row(item))
        lines.append("")

    return "\n".join(lines) + "\n"


def main():
    lessons_data = []
    all_items_by_id = {}
    for lesson in LESSONS:
        items = json.loads(lesson["queue"].read_text(encoding="utf-8"))
        data = {**lesson, "items": items}
        lessons_data.append(data)
        for item in items:
            all_items_by_id[item["issueId"]] = item

    QA_DIR.mkdir(parents=True, exist_ok=True)
    (QA_DIR / "p4-remediation-queue.md").write_text(
        build_index(lessons_data, all_items_by_id), encoding="utf-8"
    )
    for data in lessons_data:
        out = QA_DIR / f"p4-remediation-queue-{data['topic']}.md"
        out.write_text(build_topic_doc(data), encoding="utf-8")
        print("wrote", out)
    print("wrote", QA_DIR / "p4-remediation-queue.md")


if __name__ == "__main__":
    main()
