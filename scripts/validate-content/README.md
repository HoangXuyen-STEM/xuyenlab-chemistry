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

`approvedForPublish` must be `false` for every lesson except the pilots the project
owner explicitly authorized under P6.2
(`P6_OWNER_APPROVED_PUBLISH_SLUGS` in `validate.py`), which may be `true` while
remaining `in_review` and while blocking QA items are still pending owner review, as
long as the reviewer/reviewedAt/checks and visible-blocker requirements above still
hold. This does not mark those lessons `published`; only the project owner may do
that.

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
  `dung-dich-va-can-bang-hoa-hoc`) and must not reference an id absent from
  `unresolved`;
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
  publication state. `identityAssurance: "declared-not-authenticated"` is
  required — the same **P6 declared-identity limitation** as
  `ownerDecision.decidedBy`: neither field is backed by an authenticated
  teacher/owner session (see ADR-0004; that requires the P3/Auth work).

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
- for `owner-accepted-source-fidelity`: `sourceLocator.textAnchor` is
  non-empty, and its whitespace-normalized text is still traceable as a
  substring of the canonical MDX body once its own markup tags and
  whitespace are both stripped (a `<DataTable>`'s `<th>`/`<td>` tags sit
  between cell text nodes that `textAnchor` concatenates with no separator,
  so whitespace-only normalization would never match);
- for `owner-accepted-visible-fallback`: `previewPath` is a non-null
  existing asset path, referenced from the canonical MDX (e.g. a
  `ChemFigure`'s `src`) — which then falls under the same hashed-asset
  checks as any other referenced asset.

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
- a changed `severity`, `message`, `sourceLocator` or `sourceId`;
- missing MDX/asset traceability;
- a `discussionPrompt` missing any required field, or with the wrong literal
  `classification` / `scientificStatus` / `identityAssurance`.

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

### Non-authorization

`accepted-with-limitation` and `discussionPrompt` do **not** authorize
`approvedForPublish`, `published`, production deployment, R2, or P7 work —
those remain governed entirely by the existing rules above (`published`
lifecycle gate, the P6.2 `publishWaiver` exception) and by
`docs/handoffs/P6/COORDINATION.md`'s phase gates.
