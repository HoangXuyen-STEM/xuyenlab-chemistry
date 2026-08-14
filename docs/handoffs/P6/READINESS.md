# P6 content-batch readiness review

- Date: 2026-08-14
- Baseline: `3a6b881de04011b520ad1051029c6f7d8c2e84e8`
- Review type: read-only evidence review followed by plan/coordination clarification
- Verdict: **READY FOR P6-B1.0; NOT READY TO IMPORT T24**

## Scope clarification

P6.1/P6.2 completed release-engineering work for the two existing pilot lessons:
one authorized upload to the private development bucket and two narrowly waived
`approvedForPublish: true` QA records. Both lessons remain `in_review`.

The durable Phase 6 objective is different: import and review new content in batches.
No new topic has yet entered that workflow.

## Findings accepted from the Claude readiness report

- Topic 24 is the safest first controlled import: one unambiguous `.docx`, an
  existing `import_part_i` disposition and the lowest measured combined
  media/embedded-object count.
- Topic 12 is not low-risk because its in-scope source is legacy `.doc`.
- Topics 15 and 20 require a future canonical-source decision.
- Topic 23 requires a future v1 scope decision.
- Topic 25 belongs in a medium-complexity batch, not the low batch.
- `scripts/import-docx/pilot_import.py` is pilot-specific and cannot safely import
  Topic 24 without parameterization.
- `content/pilot-staging-manifest.json` and the validator currently require one
  shared status. This cannot represent existing `in_review` pilots alongside a new
  `draft` lesson.

## Adjustments to the proposal

1. Handoffs remain under `docs/handoffs/P6/` as required by
   `docs/contracts/handoff.md`. Batch IDs are encoded in filenames rather than a
   new `P6-B1` phase directory.
2. Manifest lifecycle design is a cross-cutting contract task owned by Codex. It is
   separated from Copilot's importer implementation so a contract change is not
   introduced implicitly.
3. Topic 24 is the complete first micro-batch. Estimated QA counts from pilot object
   ratios are not acceptance criteria; only the generated failure/QA reports may be
   used for planning the next lesson.
4. Decisions for Topics 12, 15, 20 and 23 are deferred until their batches are
   prepared; they do not block Topic 24.
5. The P6.2 `publishWaiver` allowlist remains frozen to the two named pilots. It is
   not a reusable publication shortcut for new lessons.

## Blocking gaps before import

- A reviewed per-lesson status manifest contract and migration path do not yet
  exist.
- The importer is still hardcoded to pilot sources.
- Topic 24 is not yet registered in `content/topics.ts`.

The last item is a normal bounded implementation step. The first two are pipeline
prerequisites.

## Deferred decisions

- Topic 15 canonical source: T15-S01 versus T15-S02 — **UNVERIFIED**.
- Topic 20 canonical/supplement relationship — **UNVERIFIED**.
- Topic 23 inclusion in v1 — **UNVERIFIED**.
- Topic 12 legacy `.doc` conversion approach — **UNVERIFIED**.
- Further live R2 uploads require a new explicit Owner authorization.

## Start gate

P6-B1.0 may begin on this baseline. P6-B1.1 must not import Topic 24 until P6-B1.0
has produced and validated the manifest lifecycle contract.
