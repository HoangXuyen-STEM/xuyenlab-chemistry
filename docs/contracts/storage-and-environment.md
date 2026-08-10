# Storage and environment contract v0.1

- Status: Provisional until development resources exist
- Owner: Codex integration owner
- Consumers: asset importer, PDF workflow, deployment configuration

## Object storage

### Public assets

- Bucket: `chem-assets`
- Public hostname: `assets.xuyenlab.com`
- Key format: `lessons/<sha256-prefix>/<sha256>.<ext>`
- Assets are content-addressed and immutable.
- Recommended response: `Cache-Control: public, max-age=31536000, immutable`.
- MDX stores the public URL plus alt text; it must not reference a local extraction temp path.

### Private PDFs

- Bucket: `chem-private`
- Key format: `pdf/<lesson-slug>/v<version>/<content-hash>.pdf`
- Bucket has no public listing or public object access.
- Signed URL TTL: 60–300 seconds.
- The server verifies session and published lesson before signing.
- PDF generation/upload is idempotent by content hash.

## Environment separation

Use distinct development/preview/production configuration. Preview must not write production database or buckets.

Expected variable names (values never enter Git or handoff files):

```text
DATABASE_URL
NEON_AUTH_BASE_URL
NEON_AUTH_COOKIE_SECRET
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
TEACHER_EMAILS
R2_ACCOUNT_ID
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_PUBLIC_BUCKET
R2_PRIVATE_BUCKET
R2_PUBLIC_BASE_URL
APP_BASE_URL
```

Exact Neon Auth variables must be confirmed against the SDK selected in Phase 3. `.env.example` contains names and safe descriptions only.

## Secret handling

- Production secrets are configured manually in provider consoles or an approved secret manager.
- Agents may document variable names, never values.
- GitHub Actions production upload runs only on protected `main` after required checks.
- Logs must redact authorization headers, database URLs, R2 credentials and signed URLs.

