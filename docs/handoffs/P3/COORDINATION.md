# Phase P3 coordination — Vertical slice

## Status

Ready to start after PR #6 is merged into `main`. This document is the assigned-task
definition for P3.1–P3.3; each owner must read it before editing.

## Phase objective

Prove one private vertical slice: an authenticated student can read a **synthetic,
staging-only** lesson fixture, save/recover progress and bookmarks, and request a
private PDF test. A teacher can read class progress through a server-side guard.

No P3 task may create a canonical `published` lesson, change an ADR/contract, or
perform a production data/bucket mutation.

## Branch and integration rules

1. Project owner merges PR #6 (`phase/p2-integration` → `main`). Every P3 task branch
   starts from that resulting `main` commit.
2. Create `phase/p3-1-backend` and `phase/p3-2-ui` from the same base commit. P3.1 and
   P3.2 may proceed in parallel.
3. P3.3 may prepare its task from the base, but must not edit `package.json` or the
   lockfile until P3.1’s dependency commit is merged. This prevents concurrent lockfile
   edits.
4. Codex creates `phase/p3-integration` only after all task PRs are review-ready;
   integration resolves conflicts. Task owners never force-push another task branch.
5. Every task writes `docs/handoffs/P3/<task-id>-<agent>.md` using
   `docs/contracts/handoff.md`. No task is complete without its handoff and required
   verification.

## P3.1 — Backend, auth, progress and bookmarks

| Field | Assignment |
| --- | --- |
| Owner | Copilot GPT-5.3-Codex; review by GPT-5.4 |
| Branch | `phase/p3-1-backend` |
| Allowed paths | `db/**`, `src/lib/auth/**`, `src/lib/db/**`, `src/lib/validation/**`, `src/features/progress/server/**`, `src/features/bookmarks/server/**`, backend-focused tests, its handoff |
| Forbidden paths | `src/app/**`, `src/components/**`, `src/lib/r2/**`, production workflow, ADRs/contracts; no other task’s files |
| Deliverable | Drizzle migrations for the frozen backend entities; Neon Auth adapter implementing `getSession`, `requireUser`, `requireTeacher`; owner-filtered progress/bookmark services; authorization and migration tests |
| Required proof | Anonymous denied; student can access only own records; teacher guard works server-side; validation rejects invalid heading/percent; migrations run against the development Neon database only after owner configures variables manually |

Implementation notes:

- Confirm the current Neon Auth SDK/session API before coding; provider imports stay
  inside `src/lib/auth/`.
- Client-supplied `user_id` is never accepted for self-service mutations.
- Use the frozen operation/error semantics in `docs/contracts/backend.md`. Record any
  SDK-shape uncertainty as an open question; do not revise the contract silently.
- A synthetic test lesson slug may be used only in test fixtures/services; it is not a
  canonical content file and must not be exposed in the library.

## P3.2 — Private-reader UI and auth screens

| Field | Assignment |
| --- | --- |
| Owner | Claude Code Sonnet; review by Opus |
| Branch | `phase/p3-2-ui` |
| Allowed paths | `src/app/**` except `src/app/api/**`, `src/components/**`, `src/features/content/**`, `src/features/progress/client/**`, `src/features/bookmarks/client/**`, UI tests, its handoff |
| Forbidden paths | `db/**`, `src/lib/auth/**`, `src/lib/db/**`, `src/lib/r2/**`, `package.json`, lockfile, production workflow, ADRs/contracts |
| Deliverable | Route shells from UX spec: login/access-denied, library/topic, synthetic lesson reader, own-progress and teacher views; responsive reader controls for progress/bookmark/complete/PDF states |
| Required proof | Protected-route/loading/empty/error states follow `docs/ux-spec.md`; keyboard-operable controls; no teacher UI for students; UI imports only provider-neutral auth/backend facades, never Neon SDK or R2 credentials |

Implementation notes:

- Do not create a real or `published` chemistry lesson. The vertical-slice fixture must
  be staging-only and excluded from normal library discovery.
- Implement against explicit typed facade interfaces and local mocks where P3.1 is not
  yet merged. Rebase/adapt only after the backend contract implementation is available.
- `src/app/api/**` belongs exclusively to P3.3 to avoid route-handler conflicts.

## P3.3 — R2, PDF endpoint, integration and security

| Field | Assignment |
| --- | --- |
| Owner | Codex Terra; security review by Codex Sol |
| Branch | `phase/p3-3-storage-security` |
| Allowed paths | `src/lib/r2/**`, `src/app/api/**`, `src/features/pdf/**`, `tests/integration/**`, `tests/e2e/**`, PDF/R2-specific test configuration, its handoff |
| Forbidden paths | `db/migrations/**`, `src/lib/auth/**`, UI route/page/component files, production workflow, ADRs/contracts; no P3.1 migration or auth-adapter edits |
| Deliverable | Server-only R2 adapter, authenticated PDF download endpoint returning 60–300 second signed URLs for a published-test stub, error handling, cross-role integration tests and vertical E2E coverage |
| Required proof | No credentials/client bundle leak; anonymous requests denied; student can request only an allowed published-test PDF; signed URL is never logged; PDF key uses the storage contract; teacher guard and cross-student denial are tested end-to-end |

Implementation notes:

- Start package/dependency work only after P3.1’s lockfile change is merged; otherwise
  use task preparation/testing that does not edit shared dependency files.
- Development/preview must use `chem-assets-dev` and `chem-private-dev` configuration,
  never production bucket values.
- A real PDF upload is optional for the initial mocked signer test; any external write
  requires the project owner’s explicit approval and development-only credentials.

## Project-owner preparation (no secrets in chat or Git)

Before external integration verification, configure the development/preview values in
the provider consoles and local `.env.local` only:

1. In Neon Auth, enable email/password in addition to the existing Google OAuth flow;
   confirm the allowed redirect URLs for local development and the Vercel preview.
2. Create development-only R2 API credentials restricted to `chem-assets-dev` and
   `chem-private-dev`; do not create or share production credentials.
3. Configure the variable names from `docs/contracts/storage-and-environment.md` in
   Vercel Preview and Development environments, using the development Neon branch and
   development R2 bucket names.
4. Keep `TEACHER_EMAILS` server-only and add only the teacher address(es) intended for
   the development test.

The agents need variable names and observed behavior only; they must never receive
secret values.

## Integration order and exit gate

1. P3.1 backend PR and handoff; review database/auth authorization first.
2. P3.2 UI PR and handoff; rebase against the merged P3.1 facade as needed.
3. P3.3 storage/PDF/security PR and handoff after the lockfile dependency sequence is
   safe.
4. Codex integration merges only reviewed task work into `phase/p3-integration`, runs
   the full verification suite and writes `docs/handoffs/P3/SUMMARY.md`.

P3 passes only when the plan’s exit gate is demonstrated: anonymous denial,
cross-student isolation, server teacher guard, persisted progress after re-login and
an authenticated-only signed PDF test URL. Any external state not exercised is marked
**UNVERIFIED**, not assumed to pass.
