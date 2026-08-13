import { describe, expect, it } from "vitest";

import { slugify, uniqueSlugger } from "./slugify";

describe("slugify", () => {
  it("romanizes Vietnamese diacritics, including đ/Đ", () => {
    expect(slugify("Tốc độ phản ứng")).toBe("toc-do-phan-ung");
    expect(slugify("Định nghĩa")).toBe("dinh-nghia");
  });

  it("lowercases and hyphenates numbering/punctuation", () => {
    expect(slugify("I. TỐC ĐỘ PHẢN ỨNG")).toBe("i-toc-do-phan-ung");
    expect(slugify("1. Khái niệm về tốc độ phản ứng")).toBe(
      "1-khai-niem-ve-toc-do-phan-ung",
    );
  });

  it("trims leading/trailing hyphens from punctuation-only edges", () => {
    expect(slugify("— Cân bằng —")).toBe("can-bang");
  });
});

describe("uniqueSlugger", () => {
  it("suffixes repeated heading text so ids never collide", () => {
    const next = uniqueSlugger();
    expect(next("Ví dụ", 0)).toBe("vi-du");
    expect(next("Ví dụ", 1)).toBe("vi-du-2");
    expect(next("Ví dụ", 2)).toBe("vi-du-3");
  });

  it("falls back to a positional id for an empty/symbol-only heading", () => {
    const next = uniqueSlugger();
    expect(next("...", 4)).toBe("muc-5");
  });
});
