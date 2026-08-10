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

