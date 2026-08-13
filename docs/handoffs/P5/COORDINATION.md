# P5 coordination — Content/release pipeline without application login

## Objective

Prove the content/PDF release pipeline and a fixture-backed library/search UI on
staging. P5 uses Vercel Preview Protection or a Share Link and does not require a
teacher or student account. Auth adapters remain frozen; account provisioning,
personal/teacher dashboards and live signed-PDF UAT are deferred to P7.

## Start gate

P5 implementation must not start until the integration owner records all of the
following:

- P4.2 and P4.3 are integrated on one clean baseline;
- both canonical pilot lessons and the staging manifest consistently record exactly
  `in_review`, never `draft` or `published`;
- the project owner signed the P4 QA records and every remaining blocking item is
  explicitly visible and dispositioned;
- the P4 staging preview, content validator, regression tests, Playwright flow and
  production build pass;
- `docs/handoffs/P4/SUMMARY.md` exists and its verdict permits P5.

The P4 closing baseline makes the validator lifecycle-aware before the integration
owner signs the summary. It requires a consistent signed `in_review` state and keeps
P4 `published` content forbidden; this work is not deferred to P5.

Current status (2026-08-13): **READY FOR P5**. P4.1–P4.5 and P4.3 regression work are
integrated; PR #24 passed GitHub Validate and Vercel and merged as
`6e2a89e5188cd1a71130b135d7cca17cd86312a2`. The project owner explicitly approved
both pilots for `in_review` staging while retaining visible fallbacks and
`T08-S01:e6352` as blocked. P5.1 and P5.2 branch from the same final P4 verdict
baseline on `main`.

## Assignment and sequencing

After the start gate passes, create both implementation branches from the exact P4
integration commit recorded in `docs/handoffs/P4/SUMMARY.md`.

| Task | Owner                        | Branch                      | Dependency                                                   |
| ---- | ---------------------------- | --------------------------- | ------------------------------------------------------------ |
| P5.1 | GitHub Copilot GPT-5.3-Codex | `phase/p5-1-pdf-pipeline`   | approved P4 integration baseline                             |
| P5.2 | Claude Code Sonnet           | `phase/p5-2-library-search` | approved P4 integration baseline; may run parallel with P5.1 |
| P5.3 | Codex integration owner      | `phase/p5-integration`      | P5.1 and P5.2 handoffs and commits                           |

P5.1 exclusively owns shared CI/workflow changes. P5.2 must not edit workflows,
dependencies, lockfiles, auth or storage code. P5.3 resolves integration conflicts;
agents must not force-push or edit another task's branch.

## Integration order

1. Integrate P5.1 and run its local credential-free dry-run.
2. Integrate P5.2 and run fixture UI tests plus mobile/empty/error/loading checks.
3. P5.3 runs the full repository verification, staging dry-run and rollback/
   regeneration rehearsal.
4. The project owner inspects the protected/share-linked preview. This is content
   presentation review, not publication approval.

## Non-negotiable boundaries

- No application login, signup, account creation or live Neon Auth call.
- No personal progress dashboard or teacher dashboard.
- No lesson may be changed to `published`.
- PR checks use no R2 or production credentials and perform no cloud write.
- A post-merge upload may target only the configured non-production bucket after
  explicit environment/branch guards and project-owner authorization.
- Production upload remains protected-main only and must never expose secrets in
  logs, artifacts, previews or handoffs.
- Generated PDFs are derived artifacts keyed by canonical content hash; they never
  become a content source.

## P5 exit gate

- Pilot `in_review` content deploys to protected/share-linked staging without an
  application account.
- Content, link and asset validation plus PDF generation dry-run pass.
- Identical content regenerates the same PDF key and does not require a duplicate
  upload.
- Backup, rollback and regeneration are rehearsed and recorded with exact commands.
- Loading, error, empty and populated library/search fixture states work on mobile.
- All external auth/live private-download gaps are recorded `DEFERRED TO P7`.
- P5.1, P5.2 and P5.3 handoffs exist; Codex writes `docs/handoffs/P5/SUMMARY.md`.
