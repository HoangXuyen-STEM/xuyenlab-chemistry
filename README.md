# XuyenLab Chemistry

Private learning application for XuyenLab Chemistry. The Phase P1.1 application
foundation uses Next.js App Router, strict TypeScript and npm.

## Local setup

Prerequisites: Node.js `>=20.9 <25`; Node 22 is the shared CI/deployment target.

```bash
nvm use
npm ci
cp .env.example .env.local
npm run dev
```

The current foundation builds without cloud credentials. Keep the unused values in
`.env.local` blank until their integration phase; never commit that file.

## Verification

Run the complete foundation check:

```bash
npm run verify
```

For the browser smoke test, install its local browser once and then run it:

```bash
npx playwright install chromium
npm run test:e2e
```

## Start here

1. Read [`KE_HOACH_XUYENLAB_CHEMISTRY.md`](KE_HOACH_XUYENLAB_CHEMISTRY.md).
2. Read relevant decisions in [`docs/adr/`](docs/adr/).
3. Read contracts in [`docs/contracts/`](docs/contracts/).
4. Read the previous phase summary in [`docs/handoffs/`](docs/handoffs/).
5. Work from a bounded issue and write the required handoff before completion.

## Current durable state

- Source inventory: [`docs/source-inventory.md`](docs/source-inventory.md)
- Source manifest: [`docs/source-manifest.csv`](docs/source-manifest.csv)
- Non-secret cloud registry: [`docs/cloud-resources.md`](docs/cloud-resources.md)
- P0 summary: [`docs/handoffs/P0/SUMMARY.md`](docs/handoffs/P0/SUMMARY.md)

The task owner must document every completed task under `docs/handoffs/`. Do not add
real credentials to this repository.
