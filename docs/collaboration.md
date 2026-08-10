# Collaboration workflow

## Task lifecycle

1. Create one issue from `.github/ISSUE_TEMPLATE/phase-task.yml`.
2. Assign one owner/model and define allowed/forbidden paths.
3. Confirm prerequisites and previous phase gate.
4. Create a short-lived branch from current `main`.
5. Implement, verify and write the task handoff.
6. Open a pull request using the repository template.
7. Integration owner reviews contracts, conflicts and test evidence.
8. Merge only when required checks pass.
9. Integration owner updates the phase `SUMMARY.md` after all phase tasks integrate.

## Branch naming

```text
phase/p1-foundation
task/p2-1-converter-spike
task/p3-2-lesson-ui
fix/<issue-number>-short-description
docs/<short-description>
```

Use lowercase ASCII and hyphens. Do not reuse a branch for unrelated work.

## Commit convention

```text
feat(scope): outcome
fix(scope): defect corrected
test(scope): coverage added
docs(scope): durable decision or handoff
chore(scope): tooling/configuration
```

## Shared-file lock

The following are single-owner files during an active task:

- package manifest and lockfile;
- migration sequence;
- `src/lib/auth/**`;
- `docs/contracts/**` and `docs/adr/**`;
- production deployment workflows;
- phase `SUMMARY.md`.

An issue must name the temporary owner before these files change. Other agents may review but do not edit concurrently.

## Recommended labels

| Label | Purpose |
|---|---|
| `phase:P0` … `phase:P7` | phase assignment |
| `agent:codex` | Codex-owned task |
| `agent:claude` | Claude Code-owned task |
| `agent:copilot` | GitHub Copilot-owned task |
| `area:frontend` | UI/MDX presentation |
| `area:backend` | auth/data/API |
| `area:content` | conversion/content QA |
| `area:ci` | tests/deployment workflow |
| `needs-owner` | requires project-owner input |
| `blocked` | cannot proceed until named prerequisite changes |

Labels are documentation only until created in the GitHub repository by an authenticated owner or tool.

