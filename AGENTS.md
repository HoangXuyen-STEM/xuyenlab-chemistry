# Agent working agreement

## Required reading

Before editing, read:

1. `KE_HOACH_XUYENLAB_CHEMISTRY.md`;
2. relevant `docs/adr/*.md` and `docs/contracts/*.md`;
3. the previous phase `docs/handoffs/P<N>/SUMMARY.md`;
4. the assigned issue, allowed paths and forbidden paths.

## Ownership

- Codex is integration owner and owns cross-cutting contracts.
- Claude Code normally owns UI and MDX presentation.
- GitHub Copilot normally owns bounded backend, test and CI issues.
- Do not concurrently edit lockfiles, migration ordering, auth adapters or production workflows.

## Completion

- Run the task's required verification.
- Do not hide failed or skipped tests.
- Write `docs/handoffs/P<N>/<task-id>-<agent>.md` using `docs/contracts/handoff.md`.
- Record plan deviations and obtain approval before changing an ADR/contract.
- Never change lesson status to `published`; only the project owner approves chemical content.
- Never commit or output secret values.

## Content

Editorial standard for every lesson under `content/topics/**` is mandatory, not optional, for all
chuyên đề (current pilots: **CD06 — Động hóa học**, **CD08 — Dung dịch và cân bằng hóa học**).
Before writing or editing any lesson, read in order:

1. `docs/content/LESSON-STYLE-GUIDE.md` — how to write a section (structure, allowed components,
   `Callout` types, math rules, checklist).
2. `docs/content/samples/SAMPLE-I1-toc-do-phan-ung.mdx` — the locked, owner-approved example.
3. `docs/content/CONTENT-WORKFLOW.md` — which flow to run and the `draft` / `in_review` /
   `published` lifecycle; `docs/contracts/content.md` for the frozen schema/QA record shape.

No pasting DOCX text into lessons, no new MDX components, no bulk rewrites of `content/topics/**`
in one task, no self-publish.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
