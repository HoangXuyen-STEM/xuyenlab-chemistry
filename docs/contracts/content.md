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

