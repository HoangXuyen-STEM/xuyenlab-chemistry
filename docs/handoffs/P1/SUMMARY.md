# Handoff summary — Phase P1

## Phase status

Integration review complete. The application foundation, CI workflow and UX
documentation are present on `main`, and all local validation passed.

**Verdict: NOT READY FOR P2**

The P1 exit gate is not fully satisfied because the supplied Vercel deployment URL is
protected by Vercel Authentication, so its fixture response remains **UNVERIFIED**.
The public production alias serves the expected fixture. The project owner accepted
the historical P1.2 sequencing deviation on 2026-08-11; that approval is recorded
below.

## Phase objective

Keep `main` buildable while establishing one reproducible setup command, one
validation command, CI enforcement and durable UX guidance with clear file ownership
for later agents.

The frozen exit criteria from `KE_HOACH_XUYENLAB_CHEMISTRY.md` are:

- one setup command;
- one test/validation command;
- green pull-request validation;
- a Vercel preview serving the fixture page;
- P1 task handoffs plus this integration summary.

## Task handoffs included

- `docs/handoffs/P1/P1.1-codex.md` — Complete.
- `docs/handoffs/P1/P1.2-copilot.md` — Complete.
- `docs/handoffs/P1/P1.3-claude.md` — Complete.

## Work completed in P1.1

- Added Next.js 16.3 App Router with strict TypeScript and a Vietnamese fixture page.
- Selected npm with `package-lock.json`, `.nvmrc` Node 22 and a declared Node range.
- Added ESLint, Prettier, typecheck, Vitest/Testing Library, Playwright and the
  aggregate `npm run verify` command.
- Added the Zod server-environment schema and safe `.env.example` names from the
  storage/environment contract.
- Added the agreed `content/`, `src/`, `db/`, `scripts/` and test skeleton without
  implementing Phase 2/3 features.
- Implementation commit: `2b6cbb1`; handoff commit: `3e37870`.

## Work completed in P1.2

- Added `.github/workflows/ci.yml` for pull requests and pushes to `main`.
- CI uses Node 22, npm dependency caching, Next.js build caching and `npm ci`.
- The `Validate` job runs formatting, lint, typecheck, unit tests and production
  build as separate visible steps.
- P1.2 reports that pull request #2 passed `CI / Validate` and that `main` requires a
  pull request plus the `Validate` status check.
- CI commit: `9e6d5d6`; pull request #2 merge: `8b34109`; P1.2 handoff commit:
  `332b37d`; pull request #3 merge: `f4dab8b`.

## Work completed in P1.3

- Added `docs/ux-spec.md` with information architecture, user flows, route states,
  MDX behavior, accessibility requirements and explicit v1 non-goals.
- Added `docs/wireframes.md` with mobile/desktop wireframes and route authorization
  mapping.
- Added `docs/design-tokens.md` with semantic colors, typography, spacing,
  breakpoints, motion and print guidance.
- No application, dependency, migration, workflow, ADR or contract file changed in
  P1.3.
- P1.3 commit: `24921c1`; pull request #4 merge: `d67a712`.

## Architecture and contract consistency review

### Consistent

- The implementation uses Next.js App Router and strict TypeScript as required by
  ADR-0001.
- CI uses GitHub Actions and does not contain production upload or secrets.
- `.env.example` contains every variable name listed in the storage/environment
  contract and uses the registered development R2 bucket names. Integration values
  remain optional until their owning adapter phase.
- Provider-specific auth, database and R2 behavior was not implemented early.
- The UX documents keep authorization on the server, keep provider SDK access behind
  `src/lib/auth`, request PDF signed URLs on demand and retain the 60–300 second TTL.
- Lesson access, progress/bookmark ownership and teacher read-only behavior align with
  the backend authorization matrix.
- Draft/in-review content is not exposed to students, and the documented MDX
  components match the frozen content contract.
- Search remains metadata-only; quizzes, grading, assignments, multiple classes,
  discussion and automatic publishing remain outside v1.
- `git diff da7b636..d67a712 -- docs/adr docs/contracts` is empty: no P1 task changed
  an ADR or contract.

### Inconsistencies and ambiguities found

1. `docs/ux-spec.md` says the authenticated primary navigation includes `Tien do`,
   which includes teachers, while `docs/wireframes.md` marks `/tien-do` as student
   only. The backend operation `getMyProgress` is authorized for a generic user.
   Phase 3 must decide the teacher behavior; this review does not choose one.
2. The UX spec describes a disabled PDF button for a lesson that is not `published`,
   while the backend contract permits signed PDFs only for published lessons and the
   same UX spec returns 404 for an unpublished lesson. That disabled state is not
   reachable under the current contract.
3. The progress formula does not define whether `currentHeadingIndex` is zero- or
   one-based. The stated formula may never reach 100 if implemented as a zero-based
   index. This is an implementation-affecting ambiguity in addition to the documented
   debounce question.
4. The teacher overview wireframe includes “latest lesson” and “updated time” fields.
   `getTeacherOverview` currently promises only aggregate class progress; its exact
   output is provisional and does not yet confirm these fields.
5. The `print-color-mode` row in `docs/design-tokens.md` is split across three Markdown
   table rows. Prettier accepts the file, but the token value is structurally
   ambiguous for consumers.
6. The P1.1 fixture CSS predates and does not implement the P1.3 design tokens. This is
   acceptable for the P1 fixture because P1.3 was documentation-only, but the fixture
   CSS must not be treated as the design source in P2/P3.
7. `package.json`/README declare Node `>=20.9.0 <25`, but locked jsdom transitive
   packages declare Node `^22.13.0 || >=24.0.0`. The verified shared target is Node
   22; full Node 20.9 compatibility is not established.
8. `package.json` records `npm@11.16.0`, while this integration run used npm 11.17.0,
   and the workflow does not explicitly install npm 11.16.0. Exact npm-version
   reproducibility in CI is **UNVERIFIED**; lockfile installation nevertheless passed.

None of items 1–8 changes an accepted ADR or frozen contract. Items 1–5 require an
explicit later decision or bounded documentation correction rather than a silent
contract edit.

## Scope and process review

- No feature beyond the P1 foundation was implemented.
- No lesson was created or changed to `published`.
- No database migration, auth adapter, cloud integration or production workflow was
  added.
- P1.3 remained documentation-only as assigned.
- Git history shows `ci(p1): add validation workflow` (`9e6d5d6`) was added to
  `phase/p1-foundation` before pull request #2 merged P1.1 into `main`. The plan and
  P1.1 handoff required P1.1 to merge before P1.2 began. P1.2 reports “Plan deviations:
  None,” so this is an undisclosed procedural deviation. No merge conflict or technical
  regression is visible. On 2026-08-11, the project owner explicitly accepted this
  retrospective deviation and stated that no rework is required.
- P1.3 is handed off as Claude Code Sonnet while the task table names `opusplan`.
  The plan permits equivalent model substitutions when availability differs, but the
  reason/approval for this substitution is **UNVERIFIED**. Scope and file ownership
  remained correct, so this is not a technical blocker.
- Whether pull request #2 required conflict resolution remains **UNVERIFIED**, as
  already recorded by P1.2.

## Validation results

Integration validation was run on 2026-08-11 at `d67a712` using Node 24.19.0 and npm
11.17.0:

| Validation                                            | Result                                                                                                                    |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `npm ci`                                              | PASS — 447 packages installed; audit reported 0 vulnerabilities                                                           |
| `npm run verify`                                      | PASS                                                                                                                      |
| Prettier scope in `verify`                            | PASS                                                                                                                      |
| ESLint with zero warnings allowed                     | PASS                                                                                                                      |
| Strict TypeScript check                               | PASS                                                                                                                      |
| Vitest                                                | PASS — 2 files, 4 tests                                                                                                   |
| Next.js production build                              | PASS — `/` and `/_not-found` prerendered                                                                                  |
| `npm run test:e2e`                                    | PASS — 1 Chromium test                                                                                                    |
| P1 workflow/UX/wireframe/token/handoff Prettier check | PASS                                                                                                                      |
| `npm ls --depth=0`                                    | PASS — dependency tree resolved                                                                                           |
| `git diff --check` for working tree and full P1 range | PASS                                                                                                                      |
| High-confidence secret-pattern filename scan          | PASS — no matching file                                                                                                   |
| ADR/contract changes during P1                        | PASS — none                                                                                                               |
| Non-doc changes after pull request #2 merge           | PASS — none                                                                                                               |
| Local `main` vs local `origin/main`                   | PASS — both `d67a712`                                                                                                     |
| Remote `origin/main` via `git ls-remote`              | PASS — `d67a712`                                                                                                          |
| Current GitHub Actions/branch-rule API recheck        | **UNVERIFIED** — local `gh` token is invalid and the API connection failed                                                |
| Supplied Vercel deployment URL                        | PARTIAL — URL recorded; HTTP 302 redirects unauthenticated requests to Vercel SSO                                         |
| Public Vercel production alias and fixture response   | PASS — `https://xuyenlab-chemistry.vercel.app/` returned HTTP 200 and its fixture text matched `src/app/page.tsx` exactly |
| Exact protected preview fixture response              | **UNVERIFIED** — requires authenticated access or a temporary shareable URL                                               |

`npm ci` continues to warn that the transitive `unrs-resolver` install script is not
explicitly approved. The required install, lint, tests and build pass without granting
that script broader trust.

## Open questions

The four questions explicitly carried by `docs/ux-spec.md` remain open:

1. Exact server signal for an authenticated email outside `allowed_students`.
2. `saveReadingPosition` debounce interval and reliable flush triggers.
3. Search matching semantics, including Vietnamese diacritic normalization.
4. Teacher overview pagination size and default sort order.

Additional questions exposed by integration review:

5. Whether teachers have their own `/tien-do` view.
6. The reachable UI behavior for PDF availability when unpublished lessons are never
   served.
7. The heading index convention used by the progress formula.
8. Whether teacher overview returns latest-lesson and last-updated fields.
9. The styling implementation layer; any dependency/lockfile change requires one
   bounded owner and coordination with the integration owner.
10. Whether Node 20 support should be narrowed to the verified Node 22 target or the
    test dependency stack should be changed later.

Questions 1–2, 5–8 belong to the Phase 3 backend/UI contract spike. Question 3 can be
deferred to the metadata-search implementation. Question 4 belongs to the teacher
overview implementation. Question 9 must be settled before a renderer task changes
shared styling dependencies. Question 10 is toolchain maintenance. None should be
silently resolved by P2 conversion code.

The five source-selection questions in `docs/source-inventory.md` also remain open from
P0. They do not block the Topic 6/8 conversion spike, but they continue to block
canonical selection/publication for the affected sources.

## Known risks

- The owner supplied
  `https://xuyenlab-chemistry-75jefi0y5-do-hoang-xuyenxuyens-projects.vercel.app/`
  and reports that its fixture is visible. An unauthenticated request redirects to
  Vercel SSO because Standard Protection is active, so the exact protected preview
  response remains **UNVERIFIED**. The public production alias independently returned
  HTTP 200 with fixture content matching `src/app/page.tsx`.
- Current GitHub Actions and branch-protection state cannot be independently queried
  from this environment. P1.2 contains precise successful evidence for pull request
  #2, but current external state remains **UNVERIFIED**.
- The CI formatting script covers application/config paths but not UX documents or the
  workflow itself. Those files passed a separate integration Prettier check, but future
  documentation formatting is not enforced by `Validate`.
- The UX specification is deliberately Draft and contains backend-dependent behavior;
  treating its proposals as frozen server contracts would create scope drift.
- The malformed print token row could be misread by an automated consumer or later
  agent.
- The P1.2 sequencing deviation weakened the intended shared-file isolation, although
  no resulting conflict is present in the merged tree.

## Deferred work

- Authenticated or shareable-URL verification of the exact protected Vercel preview.
- Neon Auth SDK/session behavior, email/password/reset verification, Google OAuth
  callback and RLS/privileged-query strategy — Phase 3.
- Database migrations, auth/database/R2 adapters and authorization tests — Phase 3.
- Styling-token implementation and production route UI — bounded P2/P3 tasks.
- Playwright in CI — intentionally omitted from the fast P1 validation workflow.
- Content conversion strategy A/B/C, idempotent importer behavior and conversion
  failure schema — Phase 2.
- Production R2 upload, PDF pipeline, staging runbook and release workflows — Phase 5.

## Phase-exit checklist

| Criterion                                     | Status                                                | Evidence                                                 |
| --------------------------------------------- | ----------------------------------------------------- | -------------------------------------------------------- |
| P0 approved before P1                         | PASS                                                  | `docs/handoffs/P0/SUMMARY.md`                            |
| P1.1 foundation and handoff complete          | PASS                                                  | Code plus `P1.1-codex.md`                                |
| P1.2 CI and handoff complete                  | PASS                                                  | Workflow plus `P1.2-copilot.md`                          |
| P1.3 UX docs and handoff complete             | PASS                                                  | Three docs plus `P1.3-claude.md`                         |
| One reproducible setup command                | PASS on verified targets                              | `npm ci`                                                 |
| One aggregate validation command              | PASS                                                  | `npm run verify`                                         |
| Local production build and fixture smoke test | PASS                                                  | Integration validation above                             |
| Pull-request validation green                 | PASS for PR #2 per P1.2; current state **UNVERIFIED** | `P1.2-copilot.md`                                        |
| Protected `main` requires `Validate`          | PASS per P1.2; current state **UNVERIFIED**           | `P1.2-copilot.md`                                        |
| Vercel preview serves fixture                 | **UNVERIFIED — BLOCKER**                              | URL exists but redirects external requests to Vercel SSO |
| Public Vercel production alias serves fixture | PASS                                                  | HTTP 200; response matches `src/app/page.tsx`            |
| Scope/contract changes approved               | PASS — none introduced                                | P1 Git diff                                              |
| Plan deviations documented and approved       | PASS                                                  | Owner accepted P1.2 sequencing deviation on 2026-08-11   |
| P1 integration summary exists                 | PASS                                                  | This file                                                |

## Blockers to clear

1. Project owner provides temporary authenticated access to the supplied preview via
   a Vercel Shareable Link, or temporarily disables Vercel Authentication while the
   integration owner verifies the fixture. Any share token must not be committed.

After this blocker is cleared, the integration owner must recheck the affected rows and
update the verdict. No new application feature is required.

## Explicit verdict

**NOT READY FOR P2**

Local code quality, buildability and the public Vercel production fixture satisfy the
technical portion of P1. The full phase exit gate has not passed because the exact
protected preview response cannot be independently inspected without authentication.
