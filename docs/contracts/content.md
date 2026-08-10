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
}
```

`approvedForPublish` may be set only by the project owner. A validator must reject `approvedForPublish: true` when any check is false or a blocking issue remains.

## Import safety

- Generated drafts and extracted assets go to a staging path until approved.
- Re-running an importer must not overwrite manually edited MDX without an explicit flag and backup/diff report.
- Every omitted/failed source object appears in a machine-readable failure report.
- HTML pilot sources are comparison inputs, not canonical replacements unless the owner changes their manifest role.

