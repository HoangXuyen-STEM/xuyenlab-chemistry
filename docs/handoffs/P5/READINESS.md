# P5 readiness review — 2026-08-13

## Verdict

**READY TO IMPLEMENT P5 after the P4 closing PR passes GitHub Validate and Vercel and
is merged to `main`.** Until that merge, P5 implementation branches remain closed.

## Evidence

| P4 prerequisite           | Evidence                                                                                                            | Status        |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------- |
| P4.1 importer/validator   | PR #16 merged                                                                                                       | PASS          |
| P4.2 UI/print             | PR #17 merged                                                                                                       | PASS          |
| P4.3 regression/E2E       | PR #21 merged; 135/135 Vitest and 7/7 Chromium E2E passed                                                           | PASS          |
| Remediation visibility    | PRs #18/#19 plus queue-derived regressions preserve every issue ID                                                  | PASS          |
| Owner staging decision    | Thầy Xuyên explicitly approved both pilots for `in_review`, retaining visible fallbacks and blocked `T08-S01:e6352` | PASS          |
| Lifecycle consistency     | Closing PR makes both QA records, canonical lessons and manifest consistently `in_review`                           | PENDING MERGE |
| Lifecycle-aware validator | Closing PR validates signed `in_review`, rejects mixed/published P4 states                                          | PENDING MERGE |
| P4 phase summary          | `docs/handoffs/P4/SUMMARY.md` is in the closing PR                                                                  | PENDING MERGE |

## Interpretation of remaining issues

- Remaining fallbacks are visible staging QA debt, not hidden failures.
- `T08-S01:e6352` remains explicitly blocked and must not be replaced with a guessed
  image.
- `approvedForPublish` remains `false`; no content is production-approved.
- The content contract forbids unresolved blockers for `published`, not for the
  Owner-approved `in_review` staging state.

## P5 start sequence

1. Require GitHub Validate and Vercel success on the P4 closing PR.
2. Merge it to protected `main`.
3. Record the exact merged commit in the P4 summary/status report.
4. Create `phase/p5-1-pdf-pipeline` and `phase/p5-2-library-search` from that exact
   commit.
5. Run P5.1 and P5.2 in parallel under their task packets; neither task may introduce
   login/account/dashboard scope.
