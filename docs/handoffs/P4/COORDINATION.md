# P4 coordination — Pilot drafts for Topics 6 and 8

## Objective and sequencing

Create reviewable Topic 6/8 drafts and staging previews without requiring application
login. Vercel Preview Protection or a Vercel Share Link is the review boundary. No
agent may set a lesson to `published`; the highest P4 status is `in_review` after the
project owner signs QA.

Run P4.1 first. After its contracts/fixtures are committed, P4.2 and P4.3 may work in
parallel from that commit. Codex does not own an implementation task in P4; it only
performs later integration review if quota is available.

| Task | Owner                        | Branch                          | Depends on                        |
| ---- | ---------------------------- | ------------------------------- | --------------------------------- |
| P4.1 | GitHub Copilot GPT-5.3-Codex | `phase/p4-1-importer-validator` | current `main`                    |
| P4.2 | Claude Code Sonnet           | `phase/p4-2-ui-print`           | merged/review-ready P4.1 baseline |
| P4.3 | GitHub Copilot GPT-5.4       | `phase/p4-3-content-e2e`        | merged/review-ready P4.1 baseline |
| P4.4 | Project owner                | no code branch required         | P4 staging preview                |

Every model must read `AGENTS.md`, the plan, relevant ADR/contracts, P3 summary, this
file and its task packet. Every task writes a handoff under `docs/handoffs/P4/`.

## Integration gate

- All generated content remains `draft` until owner review, then at most `in_review`.
- No app login is required to inspect P4 staging routes.
- Every omitted/failed source object appears in the failure/QA report.
- Validator, unit tests, Playwright staging flow and production build pass.
- Owner records chemistry/formula/table/figure/Part-I/print decisions and time spent.
