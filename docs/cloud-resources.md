# Cloud resource registry

- Last updated: 2026-08-10
- Purpose: non-secret inventory only
- Rule: never add connection strings, client secrets, access keys, API tokens or cookie secrets to this file

## GitHub

| Field | Value |
|---|---|
| Repository | `https://github.com/HoangXuyen-STEM/xuyenlab-chemistry` |
| Visibility | Private, reported by owner |
| Local remote | Not configured yet; P0.3 |

The repository is private and could not be independently fetched without authentication. Its URL is recorded from the project owner's report.

## Vercel

| Field | Value |
|---|---|
| Account | Created |
| GitHub repository access | Granted |
| Vercel project | Deferred until the Next.js foundation exists in P1 |
| Environment variables | Not configured |

## Neon

| Field | Value |
|---|---|
| Project name | `xuyenlab-chemistry` |
| Project ID | `dark-lab-12774574` |
| Region | AWS Asia Pacific (Singapore) |
| Existing branches | `production`, `development` |
| Development branch parent | `production` |
| Neon Auth | Enabled |
| Email/password provider | Not enabled; deferred to P3 auth setup |
| Google provider | Deferred to P3 after exact callback URL is known |

No database URL or auth secret is recorded.

## Cloudflare

| Field | Value |
|---|---|
| Zone/domain | `xuyenlab.com` is present in Cloudflare |
| R2 | Activated |
| Development public-asset bucket | `chem-assets-dev` |
| Development private-PDF bucket | `chem-private-dev` |
| R2 API token | Not created; defer until application integration |
| Custom domain | Not configured; defer until production release |

Both development buckets remain private until the asset delivery design is implemented and tested.

## Google Cloud / OAuth

| Field | Value |
|---|---|
| Google Cloud project | Created |
| OAuth audience | External |
| OAuth client | Not created; defer until Neon Auth supplies the exact redirect URI |
| Production consent configuration | Deferred until public homepage/privacy pages exist |

## Readiness

- Ready for P0.3 Git setup: yes.
- Ready for P1 local application foundation: yes.
- Ready for P3 auth/database integration: environment separation is ready; providers and secrets remain deliberately deferred to P3.
- Ready for production: no; intentionally deferred.
