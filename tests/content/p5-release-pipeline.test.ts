import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("P5 release pipeline integration", () => {
  it("targets exactly the owner-approved in_review subset", () => {
    const manifest = JSON.parse(
      readFileSync("content/pilot-staging-manifest.json", "utf8"),
    ) as {
      lessons: Array<{ mdxPath: string; status: string }>;
    };
    const eligible = manifest.lessons.filter(
      ({ status }) => status === "in_review",
    );
    expect(eligible.map(({ mdxPath }) => mdxPath)).toEqual([
      "content/topics/chuyen-de-06/dong-hoa-hoc.mdx",
      "content/topics/chuyen-de-08/dung-dich-va-can-bang-hoa-hoc.mdx",
    ]);
    for (const lesson of eligible) {
      expect(readFileSync(lesson.mdxPath, "utf8")).toMatch(
        /\nstatus: in_review\n/,
      );
    }
  });

  it("keeps PR CI credential-free and includes a local PDF dry-run", () => {
    const workflow = readFileSync(".github/workflows/ci.yml", "utf8");
    expect(workflow).toContain("npm run content:validate");
    expect(workflow).toContain("npm run pdf:dry-run");
    expect(workflow).not.toMatch(/R2_(?:ACCOUNT|ACCESS|SECRET|PRIVATE)/);
    expect(workflow).not.toContain("--execute");
  });
});
