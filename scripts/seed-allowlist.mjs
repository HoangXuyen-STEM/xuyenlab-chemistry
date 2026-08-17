#!/usr/bin/env node
/**
 * Seed emails into the `allowed_students` table.
 *
 * Usage:
 *   node scripts/seed-allowlist.mjs --dry-run a@x.com b@y.com
 *   node scripts/seed-allowlist.mjs --file emails.txt
 *   DATABASE_URL=... node scripts/seed-allowlist.mjs --file emails.csv
 *
 * File format: one email per line, or comma/semicolon/whitespace separated.
 * Requires DATABASE_URL unless --dry-run.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

function printHelp() {
  console.log(`Usage:
  node scripts/seed-allowlist.mjs [options] [email...]

Options:
  --file <path>   Read emails from a text/CSV file
  --dry-run       Normalize & list emails without writing to the database
  --help          Show this help

Environment:
  DATABASE_URL    Neon/Postgres connection string (required unless --dry-run)
`);
}

function parseArgs(argv) {
  const emails = [];
  let file = null;
  let dryRun = false;
  let help = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      help = true;
      continue;
    }
    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }
    if (arg === "--file" || arg === "-f") {
      file = argv[i + 1] ?? null;
      i += 1;
      continue;
    }
    if (arg.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    }
    emails.push(arg);
  }

  return { emails, file, dryRun, help };
}

function parseEmailListText(text) {
  return text
    .split(/[\s,;]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function normalizeEmails(raw) {
  const seen = new Set();
  const out = [];
  for (const token of raw) {
    const email = String(token).trim().toLowerCase();
    if (!email) continue;
    if (seen.has(email)) continue;
    seen.add(email);
    out.push(email);
  }
  return out;
}

async function main() {
  const {
    emails: cliEmails,
    file,
    dryRun,
    help,
  } = parseArgs(process.argv.slice(2));
  if (help) {
    printHelp();
    process.exit(0);
  }

  let raw = [...cliEmails];
  if (file) {
    const absolute = resolve(process.cwd(), file);
    const text = readFileSync(absolute, "utf8");
    raw = raw.concat(parseEmailListText(text));
  }

  const unique = normalizeEmails(raw);
  if (unique.length === 0) {
    console.error("No emails provided. Pass emails or --file <path>.");
    printHelp();
    process.exit(1);
  }

  console.log(
    JSON.stringify(
      {
        dryRun,
        totalInput: raw.length,
        unique: unique.length,
        emails: unique,
      },
      null,
      2,
    ),
  );

  if (dryRun) {
    console.log("[seed-allowlist] dry-run complete — no database writes.");
    return;
  }

  if (!process.env.DATABASE_URL?.trim()) {
    console.error(
      "DATABASE_URL is required for non-dry-run seed. Use --dry-run to preview.",
    );
    process.exit(1);
  }

  // Dynamic import so --dry-run works without compiling the TS DB client graph.
  const clientUrl = pathToFileURL(
    resolve(process.cwd(), "src/lib/db/client.ts"),
  ).href;
  const repoUrl = pathToFileURL(
    resolve(process.cwd(), "src/lib/db/allowlist.repo.ts"),
  ).href;

  // Prefer compiled/transpiled path via tsx if available; otherwise instruct user.
  let getDatabase;
  let createAllowlistRepository;
  try {
    ({ getDatabase } = await import(clientUrl));
    ({ createAllowlistRepository } = await import(repoUrl));
  } catch (error) {
    console.error(
      "Failed to load TypeScript DB modules. Install/use a TS loader, e.g.:\n" +
        "  npx tsx scripts/seed-allowlist.mjs --file emails.txt\n" +
        "Or run with Node that supports --experimental-strip-types.",
    );
    console.error(error);
    process.exit(1);
  }

  const db = getDatabase();
  const repo = createAllowlistRepository(db);
  let inserted = 0;
  for (const email of unique) {
    await repo.addAllowedStudent(email);
    inserted += 1;
    console.log(`[seed-allowlist] upserted ${email}`);
  }
  console.log(
    JSON.stringify({ ok: true, inserted, unique: unique.length }, null, 2),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
