# ADR-0003: Authentication and data-access boundaries

- Status: Accepted with Phase 3 validation
- Date: 2026-08-10
- Owners: Project owner, backend task owner, Codex security reviewer

## Context

All lesson pages and student data are private. Students must not access another student's progress or bookmarks. One teacher needs a class-level view. Provider SDK behavior may change, and authorization cannot rely on hidden UI elements.

## Decision

- Use Neon Auth for Google OAuth and email/password in v1.
- Expose provider-neutral server functions from `src/lib/auth`, including `getSession`, `requireUser` and `requireTeacher`.
- Keep teacher email allowlisting server-side via `TEACHER_EMAILS` and persisted profile role.
- Keep a database `allowed_students` list for controlled enrollment.
- Authorize every sensitive read/mutation on the server and filter database queries by authenticated owner/role.
- Use Row Level Security when queries run with end-user identity. If the server uses a privileged connection, server query filters and cross-user integration tests are mandatory.
- Return signed PDF URLs only from an authenticated server endpoint and only for published lessons.

## Consequences

- Middleware is navigation convenience, not the only security boundary.
- Tests must cover anonymous, student owner, different student and teacher cases.
- Preview auth/database configuration must be separate from production.
- Any auth-provider change should be isolated to adapter and session-mapping code.

## Validation required in Phase 3

- Confirm Neon Auth preview behavior and exact session API.
- Confirm email verification/reset flows.
- Confirm database identity/RLS strategy before migrations are marked stable.

