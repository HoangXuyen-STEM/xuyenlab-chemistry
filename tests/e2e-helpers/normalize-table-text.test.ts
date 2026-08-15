import { describe, expect, it } from "vitest";

import { normalizeWhitespace } from "./normalize-table-text";

describe("normalizeWhitespace", () => {
  it("treats a leading bullet-marker hyphen as reflow, not content (Topic 2, P6-B2.0)", () => {
    // A markdown list item ("- Tính kim loại") compiles to a rendered <li>
    // whose innerText has no leading "-" at all; the two must compare equal.
    expect(normalizeWhitespace("- Tính kim loại")).toBe(
      normalizeWhitespace("Tính kim loại"),
    );
  });

  it("does not equate an internal hyphenated word with its unhyphenated form", () => {
    expect(normalizeWhitespace("kim-loại")).not.toBe(
      normalizeWhitespace("kim loại"),
    );
  });

  it("does not equate a formula hyphen with its non-hyphenated form", () => {
    expect(normalizeWhitespace("H2O-OH")).not.toBe(
      normalizeWhitespace("H2OOH"),
    );
  });

  it("leaves hyphen-free content unaffected beyond whitespace collapse, e.g. Topic 24's table", () => {
    // Regression: narrowing the rule from "strip every hyphen" to "strip
    // only a hyphen immediately followed by whitespace" must not change the
    // outcome for content that never had a hyphen to begin with.
    const recorded =
      "Phân loạiCách tính độ dinh dưỡngPhân đạmTính theo phần trăm khối lượng N trong phân.";
    expect(normalizeWhitespace(recorded)).toBe(recorded.replace(/\s+/gu, ""));
  });

  it("collapses reflowed whitespace between DOCX-concatenated cell text and rendered table text", () => {
    expect(normalizeWhitespace("Cấu tạo nguyên tửVị trí")).toBe(
      normalizeWhitespace("Cấu tạo nguyên tử\t\tVị trí"),
    );
  });
});
