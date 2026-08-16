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
  sourceId: string; // ID from docs/source-manifest.csv
  sourcePath: string; // exact repository-relative source path
  section: string; // e.g. "Phần I > II. Cân bằng hóa học"
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

| Component    | Required properties                   | Purpose                             |
| ------------ | ------------------------------------- | ----------------------------------- |
| `Example`    | `title?`                              | groups problem, hint and solution   |
| `Hint`       | none                                  | collapsible hint                    |
| `Solution`   | none                                  | collapsible worked solution         |
| `ChemFigure` | `src`, `alt`, `caption?`, `sourceId?` | consistent image and print behavior |
| `DataTable`  | normal table children, `caption?`     | responsive/print-safe table wrapper |
| `Callout`    | `type`, `title?`                      | note, warning or definition         |

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
      | "published"
      | "productionDeployment"
      | "publicBucketAccess"
      | "automaticPublication"
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
- `manifestVersion` must equal the current schema version exactly (validator-
  enforced); a stale or missing value fails validation rather than being
  silently accepted.
- `in_review`-only requirements (signed `reviewer`/ISO-8601 `reviewedAt`/every
  `checks.*` true) apply per lesson, gated on that lesson's own `status`, not a
  manifest-wide value.
- Every consumer that reads this manifest (validator, importer, PDF generation,
  any UI/library feature under `src/`) must read status per lesson. A consumer
  that needs only `in_review` lessons (e.g. PDF plan generation) filters them
  out and skips `draft` entries without failing the rest of its job; it must
  not error on encountering a `draft` entry belonging to a different lesson.
- Importers regenerating a subset of lessons must not overwrite another
  lesson's already-recorded `status` (or its QA-signed content) as a side
  effect of an unrelated run — this is on top of the existing manual-edit drift
  protection in the Import safety section below. **Temporary safeguard (P6-B1.0):**
  until an importer exists that can update lessons incrementally rather than
  regenerating its whole hardcoded set from scratch, any importer that
  regenerates unconditionally must refuse to run at all — before writing
  anything, not bypassable with `--force` — whenever the manifest contains any
  `in_review` lesson. `scripts/import-docx/pilot_import.py` implements this.

## Import safety

- Generated drafts and extracted assets go to a staging path until approved.
- Re-running an importer must not overwrite manually edited MDX without an explicit flag and backup/diff report.
- Every omitted/failed source object appears in a machine-readable failure report.
- HTML pilot sources are comparison inputs, not canonical replacements unless the owner changes their manifest role.

## Remediation queue

`content/qa/pending/<lesson-slug>.remediation-queue.json` records one entry per
converter-flagged issue for a lesson (P4.4). It is optional per lesson; a
lesson without one is unaffected by this section.

```ts
// Legacy values (do not remove or rename). All three statuses and
// "reviewed-latex-mdx"/"reviewed-image-fallback"/null are in current
// committed use; "remain-blocking" is an already-declared legacy-valid
// choice (present in tests/content/remediation-queue.test.ts's own
// VALID_REMEDIATION_CHOICES enum since before P6-B1.3P) with a current
// committed queue usage count of zero — it remains preserved here for
// backward compatibility, not because any committed item uses it today.
type LegacyRemediationStatus = "pending-owner-review" | "applied" | "blocked";
type LegacyRemediationChoice =
  null | "reviewed-latex-mdx" | "reviewed-image-fallback" | "remain-blocking";

// P6-B1.3P addition:
type RemediationStatus = LegacyRemediationStatus | "accepted-with-limitation";
type RemediationChoice =
  | LegacyRemediationChoice
  | "owner-accepted-source-fidelity"
  | "owner-accepted-visible-fallback";

interface OwnerDecision {
  decidedBy: string | null;
  decidedAt: string | null; // ISO 8601 date (YYYY-MM-DD), not a timestamp
  qaNote: string | null;
  altText: string | null;
  caption: string | null;
  reviewedLatex: string | null;
}

// Optional on any remediation item; P6-B1.3P adds the type but does not
// attach an instance to any existing item (see Amendments).
interface DiscussionPrompt {
  classification: "discussion-prompt";
  recordedBy: string;
  recordedDate: string; // strict YYYY-MM-DD
  promptOrObjective: string;
  scientificStatus: "not-a-verified-scientific-conclusion";
  identityAssurance: "declared-not-authenticated";
}

interface RemediationQueueItem {
  issueId: string;
  sourceId: string;
  topic: string;
  lessonSlug: string;
  sourceLocator: {
    pathHint: string;
    sectionPath: string;
    blockOrder: number;
    textAnchor?: string;
  };
  issueCode: string;
  kind: string;
  severity: "warning" | "blocking";
  message: string;
  observedType: "formula" | "figure" | "table" | "diagram" | "unknown";
  observedTypeEvidence: string;
  previewPath: string | null;
  status: RemediationStatus;
  remediationChoice: RemediationChoice;
  ownerDecision: OwnerDecision;
  discussionPrompt?: DiscussionPrompt; // inherits this item's issueId/sourceId/sourceLocator
}
```

### `accepted-with-limitation` — what it is and is not

- It is a reviewed **operational disposition**: the project owner looked at
  the item and decided it may support teacher-led staging as-is.
- It is **not** equivalent to `applied` (content was changed to resolve the
  issue) or `blocked` (a fallback decision was approved but not yet
  actioned). No remediation payload is authored under this status.
- The issue stays in the QA record's `unresolved` array and in the failure
  report exactly as before; its `severity` does not change. A `blocking`
  item accepted this way is still `blocking` for every publication rule —
  this status has no automatic effect on lesson `status`,
  `checks`, `approvedForPublish`, `publishWaiver`, or `published`. It is not
  a publication bypass.
- `ownerDecision.decidedBy` on an `accepted-with-limitation` item is always
  the **project owner's** decision — this disposition is an Owner decision,
  not a teacher/author one. Like every P6 identity field, it is a
  **declared**, not account-authenticated, identity — the same limitation
  the rest of P6 operates under until an authenticated teacher/owner session
  exists (see ADR-0004 and the P3/Auth phase). See "Discussion prompt" below
  for `discussionPrompt.recordedBy`, which is a separate field with a wider
  set of eligible recorders.
- The item's own `lessonSlug` and `topic` must equal the canonical lesson
  currently being validated (the MDX/manifest lesson whose queue file this
  is), and its `issueCode`/`kind` must equal the corresponding failure-report
  block's — on top of the `issueId`/`sourceId`/`severity`/`message`/
  `sourceLocator` consistency already required. An item that quietly
  disagrees with its own lesson or with the failure report it claims to
  describe is rejected exactly like a missing one.

### Choice semantics

`owner-accepted-source-fidelity` (initial supported use: `kind: "table"`
items only):

- The owner compared the rendered/flattened representation with the source
  and the representation is retained unchanged; no remediation payload was
  authored.
- `ownerDecision.altText`, `caption` and `reviewedLatex` must remain `null`.
- `sourceLocator.textAnchor` must be non-empty, and its whitespace-normalized
  text must remain a substring of the canonical MDX body once the body's own
  markup tags are also stripped (a `<DataTable>`'s `<th>`/`<td>` tags sit
  between cell text nodes that `textAnchor` concatenates with no separator)
  — the same table-text traceability technique already used by
  `tests/e2e/pilot-staging.spec.ts`.

`owner-accepted-visible-fallback` (initial supported use: `kind: "image"`
items only):

- The owner visually reviewed and accepted the existing fallback asset
  unchanged; no semantic alt text/accessibility/content remediation is
  implied.
- `ownerDecision.altText`, `caption` and `reviewedLatex` must remain `null`.
- Locked to the _original_ failure-evidence fallback, not merely to some
  asset that happens to be referenced somewhere in the MDX: the
  corresponding failure-report block must itself carry a `fallback` object;
  `previewPath` must equal `fallback.assetPath` exactly; `fallback.altText`
  must be a non-empty string; and the canonical MDX must contain one
  `ChemFigure` whose `src` and `alt` **both** match that exact
  `assetPath`/`altText` pair on the _same_ element — a `src` that matches on
  one `ChemFigure` and an `alt` that happens to match on a different one
  does not count, and neither does a `previewPath` that points at some
  _other_ image that is also legitimately referenced elsewhere in the same
  MDX. Attribute ordering and newlines inside the `ChemFigure` tag do not
  affect this check.

This locks `owner-accepted-visible-fallback` to the specific asset and alt
text the converter's own failure report already recorded, not to any
image/text pair an editor could substitute later — the whole point of this
choice is "the Owner reviewed _this exact_ fallback," not "some acceptable
fallback exists somewhere in the lesson."

Using either new choice for the other kind (e.g. `owner-accepted-visible-fallback`
on a `table` item) is rejected. Extending either choice to a kind beyond its
initial supported use, or adding a new choice, requires a later contract
amendment — this section intentionally does not generalize silently.

### Applied `reviewed-image-fallback` (initial supported use: `kind: "drawing"` items only)

This is a distinct pairing from the pre-existing legacy `blocked`/
`reviewed-image-fallback` combination (the Owner reviewed a candidate
replacement but the item could not yet be finalized — see the real
`T08-S01:e6352` precedent, which stays `blocked` because no browser-safe
asset preserving the original diagram could be produced). `status:
"applied"` + `remediationChoice: "reviewed-image-fallback"` instead records
that the Owner approved a **completed** visual replacement for a native,
non-extractable drawing/shape and it is now live in the canonical MDX —
the drawing/shape equivalent of the pre-existing `applied`/
`reviewed-latex-mdx` pairing for formula recreation.

- `ownerDecision.decidedBy`, `decidedAt` and `qaNote` are required, as for
  every disposition.
- `ownerDecision.altText` and `caption` are required (non-empty strings) —
  unlike `accepted-with-limitation`, content _was_ authored here, so these
  describe the actual replacement, not a retained original.
- `ownerDecision.reviewedLatex` must remain `null` — this choice is for an
  image/diagram replacement, not a formula recreation; `reviewed-latex-mdx`
  remains the applied choice for that case.
- `previewPath` is required (a non-empty string) and identifies the
  replacement asset.
- The canonical MDX must contain exactly one `ChemFigure` whose `src`,
  `alt` and `caption` all match `previewPath`/`ownerDecision.altText`/
  `ownerDecision.caption` exactly, on the same element — the same
  single-element pairing discipline `owner-accepted-visible-fallback` uses
  above.
- The item's fallback Callout must no longer be present in the MDX body —
  the same rule the pre-existing `applied`/`reviewed-latex-mdx` pairing
  already enforces for a resolved item.
- The item remains in the QA record's `unresolved` array at its original
  `severity`, exactly like every other `applied` item (proven by
  `T06-S01`'s four `reviewed-latex-mdx` items, still listed in
  `unresolved` at `severity: "blocking"` today): `unresolved` is a fixed
  historical record of every converter-flagged item, not a live
  remediation ledger. `blockingCount`/`warningCount` do not change either
  (see "Staging manifest" above — both are explicitly historical
  import-time metrics, not live remediation state).
- This status has no automatic effect on lesson `status`, `checks`,
  `approvedForPublish`, `publishWaiver`, or `published` — a resolved
  drawing does not itself authorize publication.

Extending this pairing to another kind requires a later contract amendment
— this section intentionally does not generalize silently, the same
discipline the two choices above already follow.

### Discussion prompt

`discussionPrompt` is optional on any remediation item. It **may be
explicitly recorded by a teacher/author, or by the Project Owner** — unlike
an `accepted-with-limitation` disposition (always an Owner decision, see
above), classifying an item as a discussion prompt is not Owner-exclusive.
`recordedBy` is **declared provenance in P6**, not account-authenticated
identity, whoever records it — the same P6 declared-identity limitation
every identity field in this contract carries until an authenticated
teacher/owner session exists (see ADR-0004 and the P3/Auth phase);
`identityAssurance: "declared-not-authenticated"` records exactly this,
truthfully, for whichever role actually recorded it.

Its provenance (`issueId`, `sourceId`, `sourceLocator`) is inherited from
that same item — it does not introduce independent provenance of its own.
The validator rejects a `discussionPrompt` that carries its own `issueId`,
`sourceId`, or `sourceLocator` field, since a second, possibly conflicting
provenance on the same item would undermine the "inherits from its parent"
guarantee this contract makes. A `discussionPrompt` must **never** be
generated automatically by the converter or by a model from a converter
failure; it is always an explicit human action (teacher/author or Owner),
never inferred. Presence of a well-formed `discussionPrompt` has no
automatic effect on the item's `severity`/`status`, the lesson's QA checks,
or publication state.

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
- **P6-B1.0 integration-review follow-up (2026-08-14):** review before merge
  found that `pilot_import.py`'s existing manual-edit drift check could not
  actually detect the case that matters most: a fresh regeneration silently
  differing from an already-signed `in_review` lesson, since a signed lesson's
  recorded hash always matches its own on-disk content (there is no "drift" to
  detect in that narrow sense). A plain rerun would have overwritten both
  signed pilots back to unsigned drafts. Added the temporary safeguard
  described above. Also found `scripts/generate-pdf/generate.ts` built a PDF
  plan for every manifest lesson unconditionally, which would have attempted
  to plan a future `draft` Topic 24 lesson; it now reads per-lesson `status`
  and only plans `in_review` lessons, skipping others without failing the job.
  Also added the `manifestVersion` validator check described above. See
  `docs/handoffs/P6/P6-B1.0-claude.md` for evidence.
- **P6-B1.3P (2026-08-14):** added the operational teaching acceptance
  vocabulary to the remediation queue schema (see "Remediation queue"
  above): status `accepted-with-limitation` and choices
  `owner-accepted-source-fidelity` (table items) /
  `owner-accepted-visible-fallback` (image items), plus an optional
  `discussionPrompt` shape on any queue item. This is additive: every
  existing committed status/choice value is unchanged, and no committed
  `content/qa/pending/*.remediation-queue.json` entry was rewritten by this
  amendment. The new status carries no publication authority — a `blocking`
  item accepted this way is still `blocking` for every existing publication
  rule, and `discussionPrompt` never alters lifecycle, QA checks or
  publication state. No `discussionPrompt` instance was attached to any real
  item by this amendment; the Owner approved the capability, not a specific
  Topic 24 classification. See `scripts/validate-content/validate.py`,
  `scripts/validate-content/README.md` and
  `docs/handoffs/P6/P6-B1.3P-claude.md` for the validator rules and
  evidence.
- **P6-B2.4B policy (2026-08-15):** the project owner authorized extending
  the legacy `applied`/`reviewed-image-fallback` pairing to `kind:
"drawing"` items specifically (see "Applied `reviewed-image-fallback`"
  above), with the required fields and validator checks defined there.
  This followed a Phase 0 contract-discovery finding that no already-valid
  path both records an Owner-approved visual replacement _and_ removes the
  item's fallback Callout for a `drawing` item: the pre-existing `applied`
  status only validated/tested `reviewed-latex-mdx` (formula recreation),
  and `reviewed-image-fallback` had only ever been used with `blocked`
  (`T08-S01:e6352`, which stays blocked for unrelated font-rendering
  reasons, not because the pairing itself forbids resolution). This is a
  **capability amendment only**: it does not itself change any committed
  remediation-queue item. `T02-S01:d1402` (Topic 2's still-blocking native
  drawing, for which the Owner separately approved a print-safe SVG
  recreation in PR #46) remains `blocked`/`remain-blocking` on `main`
  after this amendment; applying the newly authorized combination to that
  specific item is separate, later work, not done by this PR. See
  `docs/handoffs/P6/P6-B2.4B-policy-applied-drawing-fallback-claude.md`
  for the full Phase 0 discovery record and evidence.
- **P6-B2.5 (2026-08-16):** the project owner explicitly authorized
  `approvedForPublish: true` for a third `in_review` lesson —
  `bang-tuan-hoan` (Chuyên đề 02) — the same T06/T08-style, per-lesson
  exception to the "no blocking issue remains" clause above, not a
  general loosening of it: one `unresolved` blocking item remains
  (`T02-S01:d1402`, the native drawing's historical QA severity, retained
  unchanged since its P6-B2.4B `applied`/`reviewed-image-fallback`
  disposition — resolving the presentation issue does not itself clear
  the QA record's own severity), alongside the lesson's two
  `accepted-with-limitation` warnings (`T02-S01:i6022`, `T02-S01:t7931`).
  Tracked in code as `P6_OWNER_APPROVED_PUBLISH_SLUGS` in
  `scripts/validate-content/validate.py`, now naming all three lessons.
  Like the P6.2 exception, this does not change lesson `status` away from
  `in_review`, and does not authorize `published`, production deployment,
  public bucket access, or automatic publication — those remain separate,
  later Owner/P7 decisions. `bang-tuan-hoan`'s QA record carries the same
  structured `publishWaiver` shape the P6.2 amendment defined, naming this
  amendment, `unresolvedBlockingCount: 1`, and acknowledging
  `T02-S01:d1402` as the retained blocked item (tracked in
  `PUBLISH_WAIVER_REQUIRED_ACKNOWLEDGED_BLOCKED_ITEMS`, the same
  discipline already used for `dung-dich-va-can-bang-hoa-hoc`'s
  `T08-S01:e6352`). See
  `docs/handoffs/P6/P6-B2.5-topic2-approve-for-publication-claude.md` for
  full evidence.
