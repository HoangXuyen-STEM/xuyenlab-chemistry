# ADR-0002: MDX content lifecycle and publication gate

- Status: Accepted
- Date: 2026-08-10
- Owners: Project owner, Codex integration owner

## Context

The repository contains 49 Word files and two derivative HTML files with substantial media and embedded objects. Word files mix Parts I–V, while v1 publishes only Part I theory and worked examples that belong to Part I. Automatic conversion cannot establish chemical correctness.

## Decision

- Treat approved MDX under `content/topics/` as the canonical publication source.
- Treat Word files as immutable reference inputs and HTML pilot files as non-canonical fidelity references until provenance is approved.
- Every lesson moves through `draft → in_review → published`.
- Importers may only create/update `draft` output and QA failure reports.
- Only the project owner may approve chemical content and change a lesson to `published`.
- Every published lesson must have a QA record under `content/qa/` with source traceability.
- Phase 2 chooses semantic, hybrid or image-first conversion for each unsupported pattern. Hybrid is the default feasibility assumption, not yet a final conversion decision.
- Generated PDFs are derived artefacts and are never edited as content sources.

## Consequences

- Conversion can be automated without silently publishing errors.
- Manual review remains the dominant schedule constraint.
- Source boundaries and failure reporting are product requirements, not optional tooling.
- Changes to imported content after manual editing require an idempotent merge/overwrite policy in Phase 2.

## Rejected alternatives

- Word as the runtime source: difficult to validate, review and render consistently.
- Full auto-publish after conversion: unacceptable chemical and formatting risk.
- PDF as canonical content: poor accessibility, searchability and maintainability.

## Amendments

- **P6-B1.0 (2026-08-14):** "Every lesson moves through `draft → in_review →
  published`" was always meant per lesson, but the P4 staging-manifest
  implementation enforced one shared `publicationStatus` for every lesson in
  `content/pilot-staging-manifest.json` at once. That was fine with exactly two
  pilots moved in lockstep, but cannot represent a new batch's lessons entering
  at `draft` while earlier lessons remain `in_review` — required before Phase 6
  content batches can be imported. Fixed by moving lifecycle status to a
  per-lesson field; no change to the lifecycle stages themselves or to who may
  advance a lesson through them. See `docs/contracts/content.md` "Staging
  manifest" and `docs/handoffs/P6/P6-B1.0-claude.md`.

