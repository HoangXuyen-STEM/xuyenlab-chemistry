# Content-hash PDF pipeline

P5 generates private PDF derivatives from the two owner-approved `in_review` pilot
lessons. The identity hash is lowercase SHA-256 of the canonical MDX file bytes
exactly as checked out. It is independent of time, environment and PDF engine
metadata.

## Credential-free dry-run

```bash
npm run content:validate
npm run build
npx playwright install chromium
npm run pdf:dry-run
npm run pdf:upload-plan -- generated-pdf/*/*.manifest.json
```

The generator runs the lifecycle-aware P4 validator, starts the local production
Next.js build, prints the no-login pilot fixtures with the repository-locked
Playwright Chromium, and writes:

```text
generated-pdf/<lesson-slug>/<content-hash>.pdf
generated-pdf/<lesson-slug>/<content-hash>.manifest.json
generated-pdf/run-metrics/<lesson-slug>-<content-hash>.json
```

The identity manifest records canonical path/hash, slug/version, referenced immutable
asset keys/hashes, generator version, local output path and the private object keys.
Duration and byte size live separately under `run-metrics` and do not affect identity.
An identical second run reports `unchanged`. A changed canonical MDX creates a new
key. A generator-version change for an existing content key stops with
`generator-changed`.

The upload-plan command is dry-run by default and does not construct an R2 client or
read credentials. External HTTP(S) availability is not checked; it remains
**UNVERIFIED** in P5.

## Guarded development upload

`.github/workflows/development-pdf-upload.yml` is manual-only. It checks out a commit
reachable from protected `main`, uses the GitHub `development` environment and
defaults to `dry_run: true`. A cloud write additionally requires
`owner_approved: true`; the development environment must have Thầy Xuyên configured
as a required reviewer. The workflow asserts `R2_PRIVATE_BUCKET` is exactly
`chem-private-dev`, checks both object keys before upload, and stops without writing
if either exists. Production upload is not provided by P5.

Required GitHub development-environment configuration (names only):

- secrets: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`;
- variable: `R2_PRIVATE_BUCKET=chem-private-dev`;
- protection: required reviewer is the project owner.

No live upload was executed during P5.1, so environment-reviewer configuration and
external R2 behavior remain **UNVERIFIED** until the integration owner performs the
authorized staging rehearsal.

## Regeneration, backup and rollback

The normal uploader never overwrites. If a generator upgrade must replace an existing
content key, first preserve both remote objects using R2 object versioning or copy
them to a project-owner-approved backup prefix and record the version IDs/backup keys.
Do not add an overwrite flag to the manual workflow without integration-owner review.

Rollback is then explicit:

1. stop the release workflow and retain its generated manifest;
2. restore the recorded prior PDF and manifest object versions/backup keys;
3. rerun `npm run pdf:dry-run` with the previous generator commit;
4. compare object keys and manifest identity before any newly authorized upload.

If no prior version ID or backup key exists, replacement is blocked rather than
silently destructive.
