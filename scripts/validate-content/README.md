# Content validation scripts

`validate.py` enforces the P4 `draft`/`in_review` subset of
`docs/contracts/content.md`:

```bash
PYTHONDONTWRITEBYTECODE=1 python3 scripts/validate-content/validate.py
PYTHONDONTWRITEBYTECODE=1 python3 scripts/validate-content/validate.py --json
```

It rejects missing/invalid metadata, duplicate slug or topic/order, mixed manifest and
lesson statuses, manifest provenance drift, broken or non-content-addressed staging
assets, broken local links, modified MDX/failure/QA reports, `published` content, and
blocking converter issues whose IDs are not visibly present in the MDX. An `in_review`
baseline additionally requires an owner-signed QA record with `reviewer`, ISO-8601
`reviewedAt`, and every check set to `true`. Unresolved issues remain allowed at
`in_review` when they stay visible and traceable; blockers are forbidden only at the
later publication gate. A passing result confirms structural integrity and recorded
approval, not independent chemical correctness.

`approvedForPublish` must be `false` for every lesson except the ones the project
owner has individually named as an approved exception
(`P6_OWNER_APPROVED_PUBLISH_SLUGS` in `validate.py` — currently the two P6.2
pilots plus `bang-tuan-hoan`, P6-B2.5), which may be `true` while remaining
`in_review` and while blocking QA items are retained/acknowledged, as long as the
reviewer/reviewedAt/checks and visible-blocker requirements above still hold. This
does not mark those lessons `published`; only the project owner may do that.

For those lessons, `approvedForPublish: true` additionally requires a structured
`publishWaiver` object on the same QA record — the source of truth carries the
reason for the exception, not only the contract and handoff. The validator rejects
a missing, malformed or mismatched waiver exactly as it would reject a missing
QA record. A `publishWaiver` must have:

- `type: "P6.2-owner-exception"` and `scope: "in_review"` (both exact-match);
- `authorizedBy` (non-empty string) and `authorizedDate` (ISO 8601 date,
  `YYYY-MM-DD` — date-only, not a timestamp: the exact time of the project
  owner's authorization is not reliably established from the source record, so
  the schema intentionally records only the date rather than a fabricated
  time-of-day);
- `doesNotAuthorize`, listing exactly `["published", "productionDeployment",
  "publicBucketAccess", "automaticPublication"]`;
- `remediationDebtRetained: true`;
- `unresolvedBlockingCount`, which must equal the record's own actual count of
  `unresolved` items with `severity: "blocking"` — this is checked against the QA
  record itself, not just asserted;
- `acknowledgedBlockedItems`, a string array of `unresolved` ids that must include
  any lesson-specific ids `PUBLISH_WAIVER_REQUIRED_ACKNOWLEDGED_BLOCKED_ITEMS`
  names for that `lessonSlug` (currently `T08-S01:e6352` for
  `dung-dich-va-can-bang-hoa-hoc`, and `T02-S01:d1402` for `bang-tuan-hoan`
  — P6-B2.5, the drawing's retained historical QA severity after its
  P6-B2.4B `applied`/`reviewed-image-fallback` disposition) and must not
  reference an id absent from `unresolved`;
- `reference.contractAmendment` and `reference.handoff`, each a repository-relative
  path (optionally with a `#fragment`) that must point to a file that actually
  exists.

## Operational teaching acceptance vocabulary (P6-B1.3P)

`validate.py` also validates the optional
`content/qa/pending/<lesson-slug>.remediation-queue.json` per lesson, but
**only** for the new vocabulary below — every legacy `status`/
`remediationChoice` value (`pending-owner-review` / `applied` / `blocked`;
`reviewed-latex-mdx` / `reviewed-image-fallback` / `remain-blocking` / `null`)
is left exactly as unvalidated as before. See
`docs/contracts/content.md` "Remediation queue" for the full type.

Approved vocabulary:

- `status: "accepted-with-limitation"` — a reviewed operational disposition,
  not a remediation. It does not mean `applied` (content changed) or
  `resolved`; the issue stays in QA `unresolved` and the failure report,
  severity is unchanged, and a `blocking` item accepted this way is still
  `blocking` for every publication rule. This status has **no** automatic
  effect on lesson `status`, QA `checks`, `approvedForPublish`,
  `publishWaiver`, or `published` — it is not a publication bypass.
- `remediationChoice: "owner-accepted-source-fidelity"` — table items
  (`kind: "table"`) only, for now.
- `remediationChoice: "owner-accepted-visible-fallback"` — image items
  (`kind: "image"`) only, for now.
- `discussionPrompt` — optional on any item, any status. Declares a P6
  teaching-discussion objective; it inherits the item's own `issueId`/
  `sourceId`/`sourceLocator` and never changes severity, QA checks, or
  publication state. Unlike `accepted-with-limitation` (always an Owner
  decision), a `discussionPrompt` **may be explicitly recorded by a
  teacher/author, or by the Project Owner** — `recordedBy` is declared
  provenance in P6, not account-authenticated identity, whoever records it.
  `identityAssurance: "declared-not-authenticated"` is required and records
  exactly that — the same **P6 declared-identity limitation** every P6
  identity field carries (see ADR-0004; that requires the P3/Auth work), not
  a claim that only the Owner can record one. It must never be generated
  automatically by the converter/model from a failure; it is always an
  explicit human action.

For `status: "accepted-with-limitation"`, the validator requires:

- `remediationChoice` is exactly one of the two approved new choices, and
  matches the item's `kind` per the mapping above;
- `ownerDecision.decidedBy` is a non-empty string;
- `ownerDecision.decidedAt` is a strict ISO 8601 date (`YYYY-MM-DD`);
- `ownerDecision.qaNote` is non-empty;
- `ownerDecision.altText`, `caption` and `reviewedLatex` are all `null` — no
  remediation payload was authored under this status, for either choice;
- the item's `issueId` is still present in the lesson's QA `unresolved`
  array and in its failure report;
- `severity`, `message` and `sourceLocator` match across the queue item, the
  QA `unresolved` entry and the failure-report block (nothing was silently
  changed);
- `sourceId` matches the failure report's own source;
- `lessonSlug` and `topic` match the canonical lesson currently being
  validated, and `issueCode`/`kind` match the corresponding failure-report
  block's — an item that disagrees with its own lesson or with the failure
  report it claims to describe is rejected;
- for `owner-accepted-source-fidelity`: `sourceLocator.textAnchor` is
  non-empty, and its whitespace-normalized text is still traceable as a
  substring of the canonical MDX body once its own markup tags and
  whitespace are both stripped (a `<DataTable>`'s `<th>`/`<td>` tags sit
  between cell text nodes that `textAnchor` concatenates with no separator,
  so whitespace-only normalization would never match);
- for `owner-accepted-visible-fallback`, locked to the *original* failure
  evidence, not merely to some asset that happens to appear in the MDX: the
  corresponding failure-report block must carry a `fallback` object;
  `previewPath` must equal `fallback.assetPath` exactly; `fallback.altText`
  must be non-empty; and the canonical MDX must contain one `ChemFigure`
  whose `src` and `alt` both match that exact pair on the *same* element
  (attribute order/newlines do not matter; a `src` match on one `ChemFigure`
  paired with an `alt` match on a different one does not count).

Rejected:

- `accepted-with-limitation` status with a legacy or `null` choice;
- either new choice paired with any status other than
  `accepted-with-limitation`;
- a choice used on the wrong `kind` (e.g. `owner-accepted-visible-fallback`
  on a `table` item);
- missing/empty Owner identity, date or note;
- a non-null `altText`/`caption`/`reviewedLatex` (an invented remediation
  payload);
- an `issueId` absent from QA `unresolved` or the failure report;
- a changed `severity`, `message`, `sourceLocator`, `sourceId`, `lessonSlug`,
  `topic`, `issueCode` or `kind`;
- missing MDX/asset traceability, including a `previewPath` that points at a
  *different* real asset than the failure report's own `fallback.assetPath`,
  an MDX `alt` that doesn't match `fallback.altText` exactly, or a
  `src`/`alt` pair that matches only when read off two different
  `ChemFigure` elements instead of the same one;
- a missing `fallback` object, `fallback.assetPath`, or `fallback.altText`
  on the failure-report block itself;
- a `discussionPrompt` missing any required field, with the wrong literal
  `classification` / `scientificStatus` / `identityAssurance`, or carrying
  its own `issueId`/`sourceId`/`sourceLocator` instead of inheriting its
  parent item's.

### Example: valid `accepted-with-limitation` table item

```json
{
  "issueId": "T24-S01:t6971",
  "kind": "table",
  "severity": "warning",
  "status": "accepted-with-limitation",
  "remediationChoice": "owner-accepted-source-fidelity",
  "sourceLocator": { "textAnchor": "…non-empty, traceable in the MDX…" },
  "ownerDecision": {
    "decidedBy": "Thầy Xuyên (Project Owner)",
    "decidedAt": "2026-08-14",
    "qaNote": "Owner compared the flattened table with the source DOCX table; representation retained unchanged.",
    "altText": null,
    "caption": null,
    "reviewedLatex": null
  }
}
```

### Example: invalid — new choice without the new status

```json
{ "status": "pending-owner-review", "remediationChoice": "owner-accepted-source-fidelity" }
```

Rejected: `owner-accepted-source-fidelity` requires
`status: "accepted-with-limitation"`.

## Applied `reviewed-image-fallback` for drawings (P6-B2.4B)

`validate.py` also validates one specific legacy combination beyond the new
vocabulary above: `status: "applied"` + `remediationChoice:
"reviewed-image-fallback"`, for `kind: "drawing"` items only. Every other
legacy status/choice combination is still left exactly as unvalidated as
before. See `docs/contracts/content.md` "Applied `reviewed-image-fallback`"
for the full prose.

This records that the Owner approved a **completed** visual replacement for
a native, non-extractable drawing/shape, now live in the MDX — the
drawing/shape equivalent of the pre-existing `applied`/`reviewed-latex-mdx`
pairing for formula recreation. It is a distinct thing from the
pre-existing `blocked`/`reviewed-image-fallback` pairing (a reviewed
candidate that could not yet be finalized, e.g. `T08-S01:e6352`).

For this combination, the validator requires:

- `kind` is exactly `"drawing"`;
- `ownerDecision.decidedBy`, `decidedAt` and `qaNote` as for every
  disposition;
- `ownerDecision.altText` and `caption` are **non-empty** (unlike
  `accepted-with-limitation`, content *was* authored here);
- `ownerDecision.reviewedLatex` is `null` (this is an image/diagram
  replacement, not a formula recreation);
- `previewPath` is a non-empty string;
- the canonical MDX contains exactly one `ChemFigure` whose `src`, `alt`
  and `caption` all match `previewPath`/`ownerDecision.altText`/
  `ownerDecision.caption` exactly, on the same element;
- the item's fallback Callout is **no longer present** in the MDX body
  (mirrors the existing `applied`/`reviewed-latex-mdx` rule);
- the item stays in QA `unresolved` and the failure report at its original
  `severity`, `sourceLocator`, `issueCode`, `sourceId` — same
  cross-reference discipline as `accepted-with-limitation`.

This status has no automatic effect on lesson `status`, QA `checks`,
`approvedForPublish`, `publishWaiver`, or `published`. `blockingCount`/
`warningCount` never change under this or any disposition — they are a
historical import-time metric (see "Staging manifest" in
`docs/contracts/content.md`), not a live remediation ledger.

Automated coverage: `tests/content/operational-acceptance.test.ts`
("P6-B2.4B: applied reviewed-image-fallback (kind: drawing)") exercises
this combination against a real, isolated, importer-generated synthetic
corpus — one positive case and six negative cases (wrong kind, missing
altText/caption/previewPath, non-null `reviewedLatex`, a mismatched
ChemFigure, a Callout left in place, and the item missing from QA
`unresolved`/the failure report) — run under `npm run verify` in CI. This
is a capability amendment only: as of P6-B2.4B, no real committed
remediation-queue item uses this combination yet.

### Non-authorization

`accepted-with-limitation` and `discussionPrompt` do **not** authorize
`approvedForPublish`, `published`, production deployment, R2, or P7 work —
those remain governed entirely by the existing rules above (`published`
lifecycle gate, the P6.2 `publishWaiver` exception) and by
`docs/handoffs/P6/COORDINATION.md`'s phase gates. The same applies to
`applied`/`reviewed-image-fallback` above.
