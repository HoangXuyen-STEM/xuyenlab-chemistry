const DIACRITIC_MAP: Record<string, string> = { đ: "d", Đ: "D" };

// Combining Diacritical Marks block (U+0300–U+036F), left behind by NFD
// normalization once a base letter and its accent are split apart.
const COMBINING_MARKS = /[̀-ͯ]/g;

/**
 * Romanizes a Vietnamese heading into a URL-fragment-safe id. Presentation
 * only: it never reads or alters lesson prose, only the derived anchor text.
 */
export function slugify(text: string): string {
  const withoutStrokeLetters = text.replace(
    /[đĐ]/g,
    (char) => DIACRITIC_MAP[char] ?? char,
  );
  const withoutDiacritics = withoutStrokeLetters
    .normalize("NFD")
    .replace(COMBINING_MARKS, "");
  return withoutDiacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Assigns a unique, stable id to each heading text in order, suffixing
 * `-2`, `-3`, ... on repeats so identical section titles do not collide.
 */
export function uniqueSlugger() {
  const seen = new Map<string, number>();
  return (text: string, index: number): string => {
    const base = slugify(text) || `muc-${index + 1}`;
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return count === 0 ? base : `${base}-${count + 1}`;
  };
}
