# Authentication adapter

Provider-specific Neon Auth imports are isolated in this directory
(`docs/contracts/backend.md`). Nothing outside `src/lib/auth/` may import
`@neondatabase/auth`.

- `neon.ts` — the only place that constructs the SDK. The import is dynamic, so unit
  tests and non-auth build paths never load it. It exposes the shared instance, the
  `/api/auth/[...path]` handler and the `src/proxy.ts` proxy.
- `server.ts` — provider-neutral `getSession`, `requireUser`, `requireTeacher`, plus
  the test-only session seam.
- `actions.ts` — server actions for sign-in (email and Google), sign-out and password
  reset. Provider error messages are mapped to generic user-facing text so the forms
  cannot enumerate accounts.
- `form-state.ts` — form-state types shared with the client forms; a `"use server"`
  module may only export async functions, so they cannot live in `actions.ts`.

Required variables: `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET` (at least 32
characters) and `APP_BASE_URL` for provider callbacks.
