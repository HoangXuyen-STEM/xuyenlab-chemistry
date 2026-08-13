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
