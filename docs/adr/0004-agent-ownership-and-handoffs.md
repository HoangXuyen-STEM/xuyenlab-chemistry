# ADR-0004: Agent ownership and durable handoffs

- Status: Accepted
- Date: 2026-08-10
- Owners: Project owner, Codex integration owner

## Context

Claude Code, GitHub Copilot and Codex will work on the same repository. Chat history is not a reliable dependency mechanism, and parallel edits to contracts, migrations or shared configuration create expensive integration conflicts.

## Decision

- Codex is integration owner and maintains cross-cutting contracts.
- Claude Code owns UI and MDX presentation tasks unless a task says otherwise.
- GitHub Copilot receives bounded backend, test and CI issues.
- Every task has one owner, one branch/worktree, a file boundary and a verifiable Definition of Done.
- Every agent writes `docs/handoffs/P<N>/<task-id>-<agent>.md` before completing its task.
- The integration owner writes `docs/handoffs/P<N>/SUMMARY.md` after integration tests.
- A later phase reads code/migrations, contracts/ADRs and approved handoffs rather than relying on chat memory.
- Deviations from the plan are documented and approved before contracts/ADRs are changed.

## Consequences

- Documentation work is part of task completion.
- A phase remains incomplete when code exists but its handoff or validation evidence is missing.
- Shared files such as lockfiles, migration order, auth adapters and production workflows are not edited concurrently.

