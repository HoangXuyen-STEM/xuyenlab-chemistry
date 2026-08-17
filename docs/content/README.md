# `docs/content/` — content authoring docs

Editorial rules for writing/editing lessons. Not the data schema — that's
[`../contracts/content.md`](../contracts/content.md) (frozen, changes require an ADR/handoff).

## Read in this order before authoring or editing any lesson

1. [`LESSON-STYLE-GUIDE.md`](./LESSON-STYLE-GUIDE.md) — how to write a section: principles,
   structure, allowed components, math rules, pre-submit checklist.
2. [`samples/SAMPLE-I1-toc-do-phan-ung.mdx`](./samples/SAMPLE-I1-toc-do-phan-ung.mdx) — the
   owner-approved worked example of that style. Not a catalog lesson.
3. [`CONTENT-WORKFLOW.md`](./CONTENT-WORKFLOW.md) — which flow to run (new lesson, remediation of
   an existing one, or a large new chuyên đề), and the `draft` / `in_review` / `published`
   lifecycle.

This standard is mandatory for **every** chuyên đề, not only the current pilots (**CD06 — Động
hóa học**, **CD08 — Dung dịch và cân bằng hóa học**).

## Where lessons actually live

```text
content/topics/chuyen-de-{NN}/{lesson-slug}.mdx
```

See `content/topics.ts` for the registered chuyên đề list and
[`../contracts/content.md`](../contracts/content.md) for the full frontmatter/QA schema. This
directory (`docs/content/`) holds authoring guidance and non-catalog samples only — nothing here
is loaded by the app or the content validator.
