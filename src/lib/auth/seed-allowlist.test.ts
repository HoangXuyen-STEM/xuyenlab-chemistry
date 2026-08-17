import { describe, expect, it } from "vitest";

import {
  normalizeEmails,
  parseEmailListText,
  summarizeSeedPlan,
} from "./seed-allowlist";

describe("normalizeEmails", () => {
  it("trims, lowercases, and de-dupes", () => {
    expect(
      normalizeEmails([
        "  A@XuyenLab.edu.vn ",
        "a@xuyenlab.edu.vn",
        "b@example.com",
        "",
        "   ",
      ]),
    ).toEqual(["a@xuyenlab.edu.vn", "b@example.com"]);
  });
});

describe("parseEmailListText", () => {
  it("splits CSV, newlines, and whitespace", () => {
    const text = `a@x.com,b@y.com
c@z.com; d@w.com`;
    expect(parseEmailListText(text)).toEqual([
      "a@x.com",
      "b@y.com",
      "c@z.com",
      "d@w.com",
    ]);
  });
});

describe("summarizeSeedPlan", () => {
  it("reports dry-run without counting inserts", () => {
    const plan = summarizeSeedPlan({
      dryRun: true,
      emails: ["a@x.com", "A@x.com", ""],
    });
    expect(plan.dryRun).toBe(true);
    expect(plan.unique).toBe(1);
    expect(plan.inserted).toBe(0);
    expect(plan.emails).toEqual(["a@x.com"]);
  });

  it("counts unique inserts when not dry-run", () => {
    const plan = summarizeSeedPlan({
      dryRun: false,
      emails: ["a@x.com", "b@y.com"],
    });
    expect(plan.inserted).toBe(2);
    expect(plan.unique).toBe(2);
  });
});
