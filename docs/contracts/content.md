# Content contract v0.1

- Status: Frozen for Phase 1–2; changes require ADR/handoff note
- Owner: Codex integration owner
- Consumers: importer, validator, Next.js renderer, PDF pipeline

## Canonical layout

```text
content/
  topics.ts
  topics/<topic-slug>/<lesson-slug>.mdx
  qa/<lesson-slug>.json
```

Topic slugs use `chuyen-de-01` through `chuyen-de-26`. Lesson slugs are lowercase ASCII kebab-case and immutable after first publication.

## Lesson frontmatter

```ts
type LessonStatus = "draft" | "in_review" | "published";

interface LessonFrontmatter {
  topic: `chuyen-de-${string}`;
  title: string;
  slug: string;
  order: number;
  summary: string;
  keywords: string[];
  estimatedMinutes: number;
  sourceFiles: SourceReference[];
  version: number;
  status: LessonStatus;
}

interface SourceReference {
  sourceId: string;       // ID from docs/source-manifest.csv
  sourcePath: string;     // exact repository-relative source path
  section: string;        // e.g. "Phần I > II. Cân bằng hóa học"
}
```

Rules:

- `topic`, `title`, `slug`, `summary` are non-empty.
- `order`, `estimatedMinutes` and `version` are positive integers.
- `(topic, order)` and `slug` are unique.
- Every `sourceId` exists in `docs/source-manifest.csv` and its `sourcePath` matches.
- `published` requires a valid QA record and no unresolved severity `blocking` issue.
- Importers create `draft`; only the project owner approves `published`.

## Supported MDX components

| Component | Required properties | Purpose |
|---|---|---|
| `Example` | `title?` | groups problem, hint and solution |
| `Hint` | none | collapsible hint |
| `Solution` | none | collapsible worked solution |
| `ChemFigure` | `src`, `alt`, `caption?`, `sourceId?` | consistent image and print behavior |
| `DataTable` | normal table children, `caption?` | responsive/print-safe table wrapper |
| `Callout` | `type`, `title?` | note, warning or definition |

Inline/display math uses KaTeX-compatible LaTeX. Chemical formulae and reactions use `mhchem` syntax when semantic conversion is reliable. Unsupported embedded objects use a `ChemFigure` fallback and must be listed in QA.

## QA record

```ts
interface LessonQaRecord {
  lessonSlug: string;
  lessonVersion: number;
  sourceIds: string[];
  reviewer: string;
  reviewedAt: string; // ISO 8601
  checks: {
    scopePartIOnly: boolean;
    chemistryVerified: boolean;
    formulasVerified: boolean;
    tablesVerified: boolean;
    figuresVerified: boolean;
    mobileVerified: boolean;
    printVerified: boolean;
  };
  unresolved: Array<{
    id: string;
    severity: "warning" | "blocking";
    description: string;
  }>;
  approvedForPublish: boolean;
  // Required when approvedForPublish is true for a P6.2-named exception lesson;
  // see Amendments and scripts/validate-content/README.md for the exact shape.
  publishWaiver?: {
    type: "P6.2-owner-exception";
    scope: "in_review";
    authorizedBy: string;
    // ISO 8601 date (YYYY-MM-DD), not a timestamp: the exact authorization time
    // is not reliably established from the source record, so only the date is
    // recorded rather than a fabricated time-of-day.
    authorizedDate: string;
    doesNotAuthorize: Array<
      "published" | "productionDeployment" | "publicBucketAccess" | "automaticPublication"
    >;
    remediationDebtRetained: true;
    unresolvedBlockingCount: number; // must equal unresolved.filter(blocking).length
    acknowledgedBlockedItems: string[]; // ids from unresolved
    reference: { contractAmendment: string; handoff: string };
  };
}
```

`approvedForPublish` may be set only by the project owner. A validator must reject `approvedForPublish: true` when any check is false or a blocking issue remains, **except** for a lesson the project owner has individually named as an approved exception (see Amendments). An approved exception still requires every check `true`, a signed `reviewer`/`reviewedAt`, and every blocking issue to stay visibly present in the MDX body — only the blanket "no blocking issue remains" clause is waived, and only for that named lesson.

## Staging manifest

`content/pilot-staging-manifest.json` records provenance and lifecycle status for
every lesson going through the staging pipeline (not just the original two
pilots — the name is historical and unchanged to avoid an unrelated rename
churning this contract).

```ts
interface StagingManifest {
  manifestVersion: string; // "1.1.0" as of P6-B1.0
  strategy: "hybrid";
  scope: string;
  lessons: StagingManifestLesson[];
  assets: Array<{
    path: string;
    sha256: string;
    bytes: number;
    sourceIds: string[];
  }>;
  // publicationStatus (manifest-wide) is REMOVED as of P6-B1.0. A manifest that
  // still carries it is invalid — see below.
}

interface StagingManifestLesson {
  slug: string;
  topic: string; // e.g. "chuyen-de-24"
  sourceId: string;
  sourcePath: string;
  sourceSha256: string;
  mdxPath: string;
  mdxSha256: string;
  failureReportPath: string;
  failureReportSha256: string;
  qaPath: string;
  qaSha256: string;
  blockingCount: number; // historical import-time metric, not live remediation state
  warningCount: number; // historical import-time metric, not live remediation state
  status: "draft" | "in_review"; // per lesson; never "published" in this manifest
}
```

Rules:

- Lifecycle status (`draft` | `in_review`) is recorded **per lesson**, not once
  for the whole manifest. Lessons at different stages may coexist in the same
  manifest — e.g. an already-`in_review` pilot alongside a freshly imported
  `draft` lesson. Neither state may be forced to match the other; nothing may
  promote a lesson's status to match its neighbors instead of its own real
  review state.
- A lesson entry's `status` must equal its MDX frontmatter `status` exactly. A
  mismatch is a validator error naming both values.
- A lesson entry's `status` must be `draft` or `in_review`; a missing, `null` or
  otherwise invalid value is a validator error — it is never silently treated as
  a default.
- A manifest-wide `publicationStatus` field is deprecated and rejected outright
  if present, so a file that was never migrated to this schema fails loudly
  instead of being silently misread.
- `in_review`-only requirements (signed `reviewer`/ISO-8601 `reviewedAt`/every
  `checks.*` true) apply per lesson, gated on that lesson's own `status`, not a
  manifest-wide value.
- Every consumer that reads this manifest (validator, importer, any UI/library
  feature under `src/`) must read status per lesson. A consumer that needs only
  `in_review` lessons filters them out; it must not error on encountering a
  `draft` entry belonging to a different lesson.
- Importers regenerating a subset of lessons must not overwrite another
  lesson's already-recorded `status` (or its QA-signed content) as a side
  effect of an unrelated run — this is on top of the existing manual-edit drift
  protection in the Import safety section below.

## Import safety

- Generated drafts and extracted assets go to a staging path until approved.
- Re-running an importer must not overwrite manually edited MDX without an explicit flag and backup/diff report.
- Every omitted/failed source object appears in a machine-readable failure report.
- HTML pilot sources are comparison inputs, not canonical replacements unless the owner changes their manifest role.

## Amendments

- **P6.2 (2026-08-13):** the project owner explicitly authorized `approvedForPublish: true`
  for exactly two `in_review` pilot lessons — `dong-hoa-hoc` (Chuyên đề 06) and
  `dung-dich-va-can-bang-hoa-hoc` (Chuyên đề 08) — despite most of each lesson's
  `unresolved` blocking QA items (96/99 and 126/168 respectively) still being
  `pending-owner-review` in the P4 remediation queue, not individually
  reviewed/resolved. The owner reviewed this exact scale before authorizing it. This
  is a per-lesson exception to the "no blocking issue remains" clause above, tracked
  in code as `P6_OWNER_APPROVED_PUBLISH_SLUGS` in
  `scripts/validate-content/validate.py`; it does not relax any other rule in this
  contract, does not change lesson `status` away from `in_review`, and does not
  authorize production publication. See `docs/handoffs/P6/P6.2-claude.md` for full
  evidence.
- **P6.2 follow-up (2026-08-13):** the project owner required the exception above to
  also be recorded at the QA-record source of truth, not only in this contract and
  the handoff. Each of the two named QA records now carries a structured
  `publishWaiver` object (see `LessonQaRecord` below and
  `scripts/validate-content/README.md` for the exact required shape) naming the
  P6.2 exception, its `in_review`-only scope, what it explicitly does not
  authorize (`published` status, production deployment, public bucket access,
  automatic publication), that remediation debt is retained (with a
  validator-checked count of remaining blocking items), that
  `dung-dich-va-can-bang-hoa-hoc` still acknowledges `T08-S01:e6352` as blocked,
  and a durable reference back to this amendment and the P6.2 handoff. The
  validator rejects `approvedForPublish: true` on either lesson if this waiver is
  missing, malformed, or its counts/references don't match reality.
- **P6.2 audit-trail correction (2026-08-13):** the initial `publishWaiver`
  implementation recorded `authorizedAt` as a full ISO 8601 timestamp with an
  invented `T00:00:00+07:00` time-of-day that was not evidence-backed. The
  project owner flagged this before merge. The field is now `authorizedDate`, an
  ISO 8601 date only (`2026-08-13`), matching the actual precision the source
  record supports. No time-of-day is asserted. See
  `docs/handoffs/P6/P6.2-claude.md` for the correction record.
- **P6-B1.0 (2026-08-14):** replaced the manifest-wide `publicationStatus` field
  with a per-lesson `status` field on `content/pilot-staging-manifest.json` (see
  "Staging manifest" above), so lessons at different lifecycle stages can
  coexist — required before any P6 content batch can be imported alongside the
  two already-`in_review` pilots without forcing a status mismatch on one side
  or the other. Migrated the two existing pilot lesson entries to
  `status: "in_review"` with no change to their actual lifecycle state, lesson
  content, QA records or `approvedForPublish`/`publishWaiver` values. Updated
  `scripts/validate-content/validate.py`, `scripts/import-docx/pilot_import.py`
  and the `src/features/content` manifest consumers to match. See
  `docs/handoffs/P6/P6-B1.0-claude.md` for full evidence.

