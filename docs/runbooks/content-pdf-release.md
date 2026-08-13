# Content/PDF release, regeneration and rollback runbook

## Scope

This runbook covers the P5 `in_review` staging pipeline. It does not publish a
lesson, create an application account or authorize a production R2 upload.

## Credential-free validation and generation

From a clean commit on protected `main`:

```bash
npm ci
npm run content:validate
npm run verify
npx playwright install chromium
npm run pdf:dry-run
npm run pdf:dry-run
npm run pdf:upload-plan -- generated-pdf/*/*.manifest.json
```

Expected behavior:

- the first PDF run generates one PDF and identity manifest per pilot lesson;
- the second run reports `unchanged` for every identical canonical MDX hash;
- upload-plan reports `dry-run` and does not construct an R2 client or read R2
  credentials;
- object keys follow
  `pdf/<lesson-slug>/v<version>/<canonical-mdx-sha256>.pdf`;
- the paired manifest replaces `.pdf` with `.manifest.json`.

Stop if validation fails, an asset hash differs, an artifact pair is incomplete or
the generator reports `generator-changed`.

## Development upload authorization

Use `.github/workflows/development-pdf-upload.yml` only after all of these are true:

1. the requested commit is reachable from protected `main`;
2. `R2_PRIVATE_BUCKET` is exactly `chem-private-dev`;
3. the project owner explicitly authorizes this individual non-dry run by setting
   `owner_approved: true` on that specific manual `workflow_dispatch` run.

The workflow defaults to dry-run. A non-dry run checks both remote object keys and
stops without writing if either exists. It has no production-upload path.

**Approval control (P6.1 decision, superseding item 3 of the original P5.3 plan):**
a GitHub environment with a required-reviewer protection rule was the originally
planned gate, but this repository is private and owned by a personal (non-org)
GitHub account, where the required-reviewers protection rule is unavailable
regardless of billing tier short of making the repository public or moving it to a
GitHub Team/Enterprise organization — both out of scope for P6.1. The project owner
reviewed this constraint on 2026-08-13 and accepted the existing `owner_approved`
boolean workflow input, combined with manual `workflow_dispatch` (already restricted
to accounts with repository write access), as the approval control instead. This is
a plan deviation from the original P5.3 runbook text, not a removal of the
human-approval requirement: only the enforcement mechanism changed.

Required environment names only:

- secrets: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`;
- variable: `R2_PRIVATE_BUCKET` (repository variable, not a secret — the bucket name
  is not sensitive and the workflow reads it via `vars.R2_PRIVATE_BUCKET`).

Never copy secret values into an issue, log, artifact or handoff.

## Backup and replacement

Normal P5 operation is append-only and never overwrites. Before replacing an object
at an existing content key:

1. stop the release workflow;
2. record both existing PDF and manifest keys;
3. preserve both objects using R2 object versioning or copy both to an
   Owner-approved backup prefix;
4. record the prior version IDs or backup keys outside the generated identity
   manifest;
5. generate with the new generator in dry-run mode and review the identity diff;
6. obtain a separate integration-owner and project-owner approval for replacement.

If either prior object cannot be backed up, replacement is blocked.

## Rollback

1. Stop further uploads and retain the failed run's identity manifest/log.
2. Restore the prior PDF and manifest as a pair from their recorded version IDs or
   backup keys.
3. Check out the prior generator commit.
4. Run content validation, build and `npm run pdf:dry-run`.
5. Confirm the restored object keys and identity manifest match the prior record.
6. Run upload-plan dry-run before requesting authorization for any cloud write.

Never restore only one member of the PDF/manifest pair.

## P5 local rehearsal evidence

On integration baseline `e446a6f85da82e3ad4135875abce378b9f742fa0`:

- first run generated 232,170-byte and 551,088-byte PDFs;
- the immediate second run reported both keys `unchanged`;
- upload-plan reported two `dry-run` pairs and made no cloud call;
- `generated-pdf/` was copied to a temporary backup and restored to a separate
  directory; `diff -qr` returned no difference;
- SHA-256 values were recorded for all six generated PDF, manifest and metrics files.

This proves local backup/restore mechanics only. R2 versioning, live object existence,
development environment review and a live development upload remain **UNVERIFIED**.
