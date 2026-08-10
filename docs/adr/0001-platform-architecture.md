# ADR-0001: Platform architecture for v1

- Status: Accepted
- Date: 2026-08-10
- Owners: Project owner, Codex integration owner

## Context

XuyenLab Chemistry serves one teacher and one class. Students must authenticate to read lessons, store progress/bookmarks and download private PDFs. Content is maintained in Git and deployed with application code. The project needs previews but does not need a dedicated long-running backend in v1.

## Decision

- Use Next.js with strict TypeScript and App Router.
- Deploy application routes and server APIs on Vercel.
- Store application data in Neon Postgres with versioned Drizzle migrations.
- Use Neon Auth behind an internal adapter in `src/lib/auth`; UI/features must not import provider SDKs directly.
- Store optimized public lesson assets in Cloudflare R2 bucket `chem-assets`.
- Store generated PDFs in private R2 bucket `chem-private`; issue short-lived signed URLs only after server authorization.
- Use GitHub Actions for validation and PDF generation/upload after merge.
- Do not use Render or a separate worker in v1 unless measured CI/runtime constraints require it.

## Consequences

- The system has few services and follows supported Next.js/Vercel workflows.
- Preview and production environments must have separate databases/configuration.
- R2 credentials and PDF signing must remain server-only.
- Provider-specific auth code is intentionally constrained to one adapter.
- Long-running tasks are deferred; Phase 5 must measure PDF workflow duration before adding infrastructure.

## Revisit when

- PDF generation regularly exceeds CI/runtime limits.
- Multiple classes/teachers or background jobs enter scope.
- Neon Auth cannot satisfy required login or preview behavior after the Phase 3 spike.

