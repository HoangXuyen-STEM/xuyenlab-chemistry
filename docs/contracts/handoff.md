# Agent handoff contract v0.1

- Status: Frozen
- Owner: Codex integration owner

## Required inputs before work

Every agent must read:

1. `KE_HOACH_XUYENLAB_CHEMISTRY.md`;
2. ADRs/contracts relevant to the task;
3. previous phase `SUMMARY.md`;
4. its issue/task definition and file ownership.

The agent records these inputs in its task handoff.

## Per-task output

Path: `docs/handoffs/P<N>/<task-id>-<agent>.md`

Required sections:

```md
# Handoff <task-id> — <agent/model>

## Status
Complete | Partial | Blocked

## Inputs read
- Plan, ADR, contract and prior handoff paths.

## Completed
- Observable outcomes and issue references.

## Decisions and assumptions
- Decisions, assumptions and related ADR/contract.

## Files and migrations changed
- Path, purpose and migration environment/status.

## Verification
- Exact commands, exit results and any omitted test with reason.

## Environment and external services
- Variable/config names only; never secret values.

## Remaining work, known issues and risks
- Priority and proposed owner.

## Plan deviations
- None, or approved deviation with rationale and impact.

## Required inputs for the next task/phase
- Contracts, fixtures, accounts/config and prerequisites.
```

## Phase summary

Path: `docs/handoffs/P<N>/SUMMARY.md`

The integration owner writes it after reading all task handoffs and running integration checks. It must state:

- phase status and exit-gate result;
- task handoffs included;
- integrated commit/PR identifiers when Git is available;
- final verification commands/results;
- decisions promoted to ADR/contracts;
- unresolved blockers and explicit next-phase inputs.

A phase with missing handoff, failed required validation or unresolved blocking deviation is not complete.

