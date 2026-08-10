# GitHub repository setup for the project owner

## Repository

- Remote: `https://github.com/HoangXuyen-STEM/xuyenlab-chemistry`
- Visibility: Private
- Default branch target: `main`

P0.3 configures the local remote but does not push or mutate GitHub settings without authenticated approval.

## Ruleset for `main`

After the first push, open GitHub repository:

1. **Settings → Rules → Rulesets → New branch ruleset**.
2. Name: `protect-main`.
3. Enforcement: Active.
4. Target branch: include default branch `main`.
5. Enable:
   - restrict deletions;
   - block force pushes;
   - require a pull request before merging;
   - require conversation resolution before merging.
6. Set required approvals to one if the account/organization allows the owner to approve agent PRs.
7. Add required status checks only after P1 creates stable CI job names.

Do not require a check that does not yet exist; that can make `main` impossible to update.

## Access

- Keep repository private.
- Grant each external app access only to this repository where possible.
- Review installed GitHub Apps periodically.
- Do not grant agents organization-wide administration.

## Source documents

Git LFS is not installed in the current environment. The initial 127.47 MiB source set can be committed as ordinary Git binary files because the largest file is about 17 MiB. Avoid committing repeated renamed versions.

Before a future bulk replacement/version cycle, reassess Git LFS. Enabling it later changes clone/pull requirements for every collaborator, so it must be an explicit ADR rather than an incidental agent action.

