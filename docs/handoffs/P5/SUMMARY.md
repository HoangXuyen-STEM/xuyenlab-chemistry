# Phase 5 integration summary

- Phase: P5 — Content/release pipeline without application login
- Integration owner: Codex
- Integration baseline: `e446a6f85da82e3ad4135875abce378b9f742fa0`
- Exit verdict: **READY FOR P6**

## Phase objective

Prove a content-hash PDF/release dry-run and a fixture-backed library/search staging
experience without application login, while retaining P4 lifecycle and publication
boundaries.

## Work completed

### P5.1 — Copilot PDF/content pipeline

- Commit `68e1879`, PR #26, merged as
  `2f47f73d7d3255f3174dc186defb68b6af6aa0c2`.
- Added canonical-MDX SHA-256 PDF identity, immutable asset validation, deterministic
  manifests, idempotent generation and guarded no-overwrite upload planning.
- Extended CI with content validation and credential-free PDF generation.
- Added a manual development-only workflow that defaults to dry-run and has no
  production-upload path.

### P5.2 — Claude staging library/search

- Commit `31f1ea4`, PR #27, merged as
  `e446a6f85da82e3ad4135875abce378b9f742fa0` after incorporating P5.1.
- Added `/fixtures/p5/library` with populated/loading/error/empty/no-result states.
- Added canonical metadata/QA reading, Vietnamese-diacritic-insensitive ranked search,
  mobile/accessibility behavior and staging-only links.

### P5.3 — Codex integration/release rehearsal

- Reviewed contract/architecture and unauthorized-scope risks.
- Ran combined validation, browser checks, PDF idempotency, upload dry-run and local
  backup/restore rehearsal.
- Added `docs/runbooks/content-pdf-release.md` and the P5.3 handoff.

## Architecture and contract consistency

- Canonical content remains MDX; PDFs are derived artifacts.
- The existing private PDF key contract is reused; no duplicate key format exists.
- `in_review` staging content remains separate from `published` download
  authorization.
- `approvedForPublish` remains false and no lesson was published.
- PR CI uses no R2 secret and performs no upload.
- P5.2 stays under `/fixtures/**`, outside authenticated production routes.
- Auth adapters, DB/migrations, canonical chemistry, QA decisions and ADR/contracts
  were not changed in P5.
- No unapproved scope or contract change was found.

## Validation results

- PR #26 GitHub Validate and Vercel: PASS.
- PR #27 combined-tree GitHub Validate and Vercel: PASS.
- Unit/integration: 39 files, 159/159 PASS.
- Chromium integration E2E: 12/12 PASS.
- Content validator: PASS.
- PDF generation: two PDFs generated; identical rerun reported both `unchanged`.
- Upload-plan dry-run: PASS, zero cloud calls.
- Local backup/restore copy: byte-equivalent by `diff -qr`.
- Deployed fixture: HTTP 200, staging banner and library heading verified.

## Open questions

- Is the GitHub `development` environment configured with Thầy Xuyên as a required
  reviewer? **UNVERIFIED**.
- Should a future authorized R2 write use object versioning or an approved backup
  prefix for replacement? **UNVERIFIED; decide before replacement is added.**
- When should production account/auth/private-download UAT occur? **DEFERRED TO P7**
  by the approved plan.

## Known risks

- `T08-S01:e6352` remains a visible blocked staging fallback.
- Other unresolved P4 fallback items remain visible review debt and prohibit treating
  this content as production-published.
- A provider failure between two new remote-object writes could create a partial
  PDF/manifest pair; the runbook requires stopping and recovery, not blind retry.
- External HTTP(S) link availability and live R2 behavior are UNVERIFIED.

## Deferred work

- Live development R2 upload and remote rollback.
- Production publication.
- Account provisioning, live Neon Auth and authenticated signed-PDF UAT.
- Personal/student and teacher dashboards.

## Phase-exit checklist

- [x] Pilot `in_review` staging deploy is reachable without an application account.
- [x] Content, local link and asset validation pass.
- [x] PDF generation is keyed by canonical content hash.
- [x] Identical regeneration reports `unchanged`.
- [x] Credential-free upload planning passes without a cloud call.
- [x] Local backup/restore rehearsal passes and the runbook exists.
- [x] Library/search populated/loading/error/empty states pass on mobile.
- [x] P5.1, P5.2 and P5.3 handoffs exist.
- [x] External auth/private-download gaps are explicitly deferred to P7.
- [x] No lesson is `published` and no production upload occurred.

## Verdict

**READY FOR P6.** This verdict covers the P5 no-login staging and credential-free
release rehearsal. It does not authorize production publication or a live R2 write.
