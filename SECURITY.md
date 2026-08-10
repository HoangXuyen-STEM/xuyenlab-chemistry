# Security policy

## Secrets

Never commit or paste into agent prompts, issues, pull requests, handoffs or logs:

- database connection strings;
- OAuth client secrets or downloaded credential JSON;
- Cloudflare/R2 access keys or API tokens;
- cookie/session secrets;
- authorization headers or signed download URLs.

Only variable names and non-secret resource identifiers belong in Git. Store values in local `.env` files ignored by Git or in provider-managed environment settings.

If a secret is exposed:

1. revoke/rotate it in the provider console immediately;
2. do not rely on deleting the Git line or chat message;
3. document the incident without reproducing the secret;
4. review logs and affected access.

## Reporting a vulnerability

Use a private communication channel with the repository owner. Do not open a public issue containing exploit details, student information or credentials.

## Student data

- Use synthetic accounts/data in development and previews.
- Do not copy production student data into preview environments.
- Authorization is enforced server-side and tested for cross-user access.

