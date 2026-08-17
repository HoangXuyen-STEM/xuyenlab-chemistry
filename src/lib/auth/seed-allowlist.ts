/**
 * Pure helpers for the allowlist seed CLI.
 * Kept free of Node/DB imports so unit tests can run without a live database.
 */

export type SeedAllowlistOptions = {
  dryRun: boolean;
  emails: string[];
};

export type SeedAllowlistResult = {
  dryRun: boolean;
  total: number;
  unique: number;
  inserted: number;
  skippedEmpty: number;
  emails: string[];
};

/** Normalize raw email tokens: trim, lowercase, drop empties, de-dupe. */
export function normalizeEmails(raw: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const token of raw) {
    const email = token.trim().toLowerCase();
    if (!email) continue;
    if (seen.has(email)) continue;
    seen.add(email);
    out.push(email);
  }
  return out;
}

/**
 * Split a free-form text block (CSV, newline, comma, semicolon, whitespace)
 * into raw email tokens before normalizeEmails().
 */
export function parseEmailListText(text: string): string[] {
  return text
    .split(/[\s,;]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function summarizeSeedPlan(
  options: SeedAllowlistOptions,
): SeedAllowlistResult {
  const rawCount = options.emails.length;
  const unique = normalizeEmails(options.emails);
  return {
    dryRun: options.dryRun,
    total: rawCount,
    unique: unique.length,
    inserted: options.dryRun ? 0 : unique.length,
    skippedEmpty: Math.max(0, rawCount - unique.length),
    emails: unique,
  };
}
