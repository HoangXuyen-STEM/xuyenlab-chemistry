/**
 * Compares a `failure-report.json` block's recorded `sourceLocator.textAnchor`
 * (DOCX cell/paragraph text concatenated with no separator at all) against a
 * rendered `<table>`'s `innerText()` (which naturally inserts whitespace at
 * cell/row boundaries). Both sides are normalized the same way so the
 * comparison is insensitive to that reflow, without hiding a real
 * source-fidelity difference.
 *
 * Strips all whitespace, and strips a "-" only when it is immediately
 * followed by whitespace. In this corpus a markdown-rendered bullet marker
 * is always exactly "- " (hyphen-space) at the start of an MDX table cell's
 * paragraph, and the compiled DOM omits that leading hyphen entirely
 * (observed on Topic 2's table, P6-B2.0); an internal/compound hyphen (e.g.
 * "kim-loại") or a formula hyphen (e.g. "H2O-OH") is never followed
 * immediately by whitespace in this source text, so this narrower rule
 * cannot remove it — unlike stripping every "-" unconditionally, which
 * would hide a real source-fidelity failure involving a minus sign, a
 * range, or a hyphenated word.
 */
export function normalizeWhitespace(value: string): string {
  const withoutBulletHyphens = value.replace(/-(?=\s)/gu, "");
  return withoutBulletHyphens.replace(/\s+/gu, "");
}
