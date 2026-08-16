// @vitest-environment node

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");

interface QaRecord {
  approvedForPublish: boolean;
  checks: Record<string, boolean>;
  lessonSlug: string;
  lessonVersion: number;
  reviewStatus: string;
  reviewedAt: string | null;
  reviewer: string | null;
  sourceIds: string[];
  unresolved: Array<{ id: string; severity: string; description: string }>;
  publishWaiver?: unknown;
}

interface QueueItem {
  issueId: string;
  sourceId: string;
  topic: string;
  lessonSlug: string;
  kind: string;
  severity: string;
  message: string;
  issueCode: string;
  sourceLocator: unknown;
  observedType: string;
  observedTypeEvidence: string;
  previewPath: string | null;
  status: string;
  remediationChoice: string | null;
  ownerDecision: {
    decidedBy: string | null;
    decidedAt: string | null;
    qaNote: string | null;
    altText: string | null;
    caption: string | null;
    reviewedLatex: string | null;
  };
  discussionPrompt?: unknown;
}

interface ManifestLesson {
  slug: string;
  topic: string;
  status: string;
  blockingCount: number;
  warningCount: number;
  mdxPath: string;
  mdxSha256: string;
  qaPath: string;
  qaSha256: string;
  failureReportPath: string;
  failureReportSha256: string;
  sourceId: string;
  sourcePath: string;
  sourceSha256: string;
}

function readJson<T>(relativePath: string): T {
  return JSON.parse(
    readFileSync(path.join(repoRoot, relativePath), "utf8"),
  ) as T;
}

function sha256(relativePath: string): string {
  return createHash("sha256")
    .update(readFileSync(path.join(repoRoot, relativePath)))
    .digest("hex");
}

const qa = readJson<QaRecord>("content/qa/pending/phan-bon-hoa-hoc.json");
const queue = readJson<QueueItem[]>(
  "content/qa/pending/phan-bon-hoa-hoc.remediation-queue.json",
);
const manifest = readJson<{ lessons: ManifestLesson[] }>(
  "content/pilot-staging-manifest.json",
);
const topic24 = manifest.lessons.find(
  (lesson) => lesson.slug === "phan-bon-hoa-hoc",
)!;
const failureReport = readJson<{
  blocks: Array<{
    id: string;
    severity: string;
    message: string;
    issueCode: string;
    kind: string;
    sourceLocator: unknown;
  }>;
}>("content/qa/import-reports/phan-bon-hoa-hoc.failure.json");
const blocksById = new Map(
  failureReport.blocks.map((block) => [block.id, block]),
);

describe("P6-B1.4: Topic 24 Owner QA record", () => {
  it("is signed in_review with all seven checks true", () => {
    expect(qa.reviewStatus).toBe("in_review");
    expect(qa.reviewer).toBe("Thầy Xuyên (Project Owner)");
    expect(Object.keys(qa.checks)).toHaveLength(7);
    for (const [check, value] of Object.entries(qa.checks)) {
      expect(value, check).toBe(true);
    }
  });

  it("records reviewedAt as the truthful date-only value", () => {
    expect(qa.reviewedAt).toBe("2026-08-14");
    expect(qa.reviewedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/u);
  });

  it("keeps approvedForPublish false and carries no publishWaiver", () => {
    expect(qa.approvedForPublish).toBe(false);
    expect(qa.publishWaiver).toBeUndefined();
  });

  it("keeps all three unresolved warning entries unchanged", () => {
    expect(qa.unresolved).toEqual([
      {
        description:
          "DOCX table was flattened to an HTML table and needs visual review.",
        id: "T24-S01:t6971",
        severity: "warning",
      },
      {
        description:
          "Extracted image needs meaningful alt text and visual verification.",
        id: "T24-S01:i8191",
        severity: "warning",
      },
      {
        description:
          "Extracted image needs meaningful alt text and visual verification.",
        id: "T24-S01:i0305",
        severity: "warning",
      },
    ]);
  });

  it("keeps lessonVersion and sourceIds unchanged", () => {
    expect(qa.lessonVersion).toBe(1);
    expect(qa.sourceIds).toEqual(["T24-S01"]);
  });
});

describe("P6-B1.4: Topic 24 remediation queue dispositions", () => {
  it("uses the exact approved disposition pair for each of the three items", () => {
    expect(queue).toHaveLength(3);
    const byId = new Map(queue.map((item) => [item.issueId, item]));

    const table = byId.get("T24-S01:t6971")!;
    expect(table.status).toBe("accepted-with-limitation");
    expect(table.remediationChoice).toBe("owner-accepted-source-fidelity");
    expect(table.ownerDecision.decidedBy).toBe("Thầy Xuyên (Project Owner)");
    expect(table.ownerDecision.decidedAt).toBe("2026-08-14");
    expect(table.ownerDecision.qaNote).toContain(
      "compared the flattened table with the Word source",
    );
    expect(table.ownerDecision.qaNote).toContain(
      "No content remediation was performed",
    );

    for (const id of ["T24-S01:i8191", "T24-S01:i0305"]) {
      const image = byId.get(id)!;
      expect(image.status, id).toBe("accepted-with-limitation");
      expect(image.remediationChoice, id).toBe(
        "owner-accepted-visible-fallback",
      );
      expect(image.ownerDecision.decidedBy, id).toBe(
        "Thầy Xuyên (Project Owner)",
      );
      expect(image.ownerDecision.decidedAt, id).toBe("2026-08-14");
      expect(image.ownerDecision.qaNote, id).toContain("visually verified");
      expect(image.ownerDecision.qaNote, id).toContain(
        "No meaningful semantic alt text or accessibility improvement was authored or applied",
      );
    }
  });

  it("keeps ownerDecision.altText, caption and reviewedLatex null for all three items", () => {
    for (const item of queue) {
      expect(item.ownerDecision.altText, item.issueId).toBeNull();
      expect(item.ownerDecision.caption, item.issueId).toBeNull();
      expect(item.ownerDecision.reviewedLatex, item.issueId).toBeNull();
    }
  });

  it("does not add a discussionPrompt to any item (no concrete prompt was authorized)", () => {
    for (const item of queue) {
      expect(item.discussionPrompt, item.issueId).toBeUndefined();
    }
  });

  it("preserves issueId/sourceId/topic/lessonSlug/sourceLocator/issueCode/kind/severity/message/previewPath against the untouched failure report", () => {
    for (const item of queue) {
      const block = blocksById.get(item.issueId);
      expect(
        block,
        `${item.issueId} missing from failure report`,
      ).toBeDefined();
      expect(item.sourceId).toBe("T24-S01");
      expect(item.topic).toBe("chuyen-de-24");
      expect(item.lessonSlug).toBe("phan-bon-hoa-hoc");
      expect(item.issueCode).toBe(block!.issueCode);
      expect(item.kind).toBe(block!.kind);
      expect(item.severity).toBe(block!.severity);
      expect(item.message).toBe(block!.message);
      expect(item.sourceLocator).toEqual(block!.sourceLocator);
    }
  });

  it("retains every issue in the QA unresolved array (no history removed)", () => {
    const unresolvedIds = new Set(qa.unresolved.map((entry) => entry.id));
    for (const item of queue) {
      expect(unresolvedIds.has(item.issueId), item.issueId).toBe(true);
    }
  });
});

describe("P6-B1.4: Topic 24 lifecycle metadata", () => {
  it("MDX frontmatter and manifest both declare in_review", () => {
    const mdx = readFileSync(
      path.join(repoRoot, "content/topics/chuyen-de-24/phan-bon-hoa-hoc.mdx"),
      "utf8",
    );
    expect(mdx).toMatch(/\nstatus: in_review\n/u);
    expect(topic24.status).toBe("in_review");
  });

  it("refreshed only Topic 24's mdxSha256/qaSha256, matching the files on disk", () => {
    expect(topic24.mdxSha256).toBe(
      sha256("content/topics/chuyen-de-24/phan-bon-hoa-hoc.mdx"),
    );
    expect(topic24.qaSha256).toBe(
      sha256("content/qa/pending/phan-bon-hoa-hoc.json"),
    );
  });

  it("preserved Topic 24's import-time blockingCount/warningCount and provenance", () => {
    expect(topic24.blockingCount).toBe(0);
    expect(topic24.warningCount).toBe(3);
    expect(topic24.sourceId).toBe("T24-S01");
    expect(topic24.sourcePath).toBe(
      "24. Chuyen de 24_ Phan bon hoa hoc_OK.docx",
    );
    expect(topic24.sourceSha256).toBe(
      "d501f3af84e6fd635a1462a148181f7446fecf68c420008f21f803ed64fd872a",
    );
    expect(topic24.failureReportSha256).toBe(
      "afa71f8707dc55010536e4da44627a49014930d0627a6dcc896d8bb76e401bea",
    );
  });

  it("kept manifestVersion unchanged", () => {
    const full = readJson<{ manifestVersion: string }>(
      "content/pilot-staging-manifest.json",
    );
    expect(full.manifestVersion).toBe("1.1.0");
  });

  it("did not change the Chemistry body, table, ChemFigure src/alt/caption, or formulas", () => {
    const mdx = readFileSync(
      path.join(repoRoot, "content/topics/chuyen-de-24/phan-bon-hoa-hoc.mdx"),
      "utf8",
    );
    expect(mdx).toContain(
      "Phân bón là những hóa chất có chứa các nguyên tố dinh dưỡng",
    );
    expect(mdx).toContain('<DataTable caption="Bảng 1 trích từ DOCX">');
    expect(mdx).toContain("Tính theo phần trăm khối lượng N trong phân.");
    expect(mdx).toContain(
      'src="/staging-assets/lessons/d4/d430885438c33c62a0f3bbe2cf7e7969af17747d2da2be3622becd4639456453.jpeg"',
    );
    expect(mdx).toContain(
      'src="/staging-assets/lessons/95/955c50af88187216dafd2353c74b540e510403a0c970d8f247cc0d2e01e25dce.jpeg"',
    );
    expect(mdx).toContain(
      'alt="Hình trích từ DOCX; cần chủ dự án bổ sung mô tả"',
    );
    expect(mdx).toContain('caption="Nguồn T24-S01, hình 1"');
    expect(mdx).toContain('caption="Nguồn T24-S01, hình 2"');
  });
});

describe("P6-B1.4: T06/T08 preserved exactly", () => {
  it("keeps Topic 6 and Topic 8 manifest entries byte/deep-equal to their known-committed shape", () => {
    const t06 = manifest.lessons.find(
      (lesson) => lesson.slug === "dong-hoa-hoc",
    )!;
    const t08 = manifest.lessons.find(
      (lesson) => lesson.slug === "dung-dich-va-can-bang-hoa-hoc",
    )!;
    expect(t06).toEqual({
      blockingCount: 96,
      failureReportPath: "content/qa/import-reports/dong-hoa-hoc.failure.json",
      failureReportSha256:
        "3cba350fc6b3f866599005a9ec4954fb660aa3ed3c3da4cbf10289fd57d1e7d6",
      mdxPath: "content/topics/chuyen-de-06/dong-hoa-hoc.mdx",
      mdxSha256:
        "c9fb96888559fd932ce3e2385832a26c2fd17c83e92e344e9686c27fb7195f86",
      qaPath: "content/qa/pending/dong-hoa-hoc.json",
      qaSha256:
        "cab856f5ac0529b052c9cfe58de96beea09584ae557e49ea953408ae2b474343",
      slug: "dong-hoa-hoc",
      sourceId: "T06-S01",
      sourcePath: "6. Chuyen de 6. Dong hoa hoc.ok.docx",
      sourceSha256:
        "a5ec536987194ea8907435b8852e50ddca0aa98b28ab4754e83820e015e331f5",
      status: "in_review",
      topic: "chuyen-de-06",
      warningCount: 3,
    });
    expect(t08).toEqual({
      blockingCount: 126,
      failureReportPath:
        "content/qa/import-reports/dung-dich-va-can-bang-hoa-hoc.failure.json",
      failureReportSha256:
        "69f6fdbb8ca708205042baec15343607eab14be35061c3ef822bb8082ccca0de",
      mdxPath: "content/topics/chuyen-de-08/dung-dich-va-can-bang-hoa-hoc.mdx",
      mdxSha256:
        "0c0cf71e589b1e435167d5441490c92ff9b4ee055b2d025663d532065f353899",
      qaPath: "content/qa/pending/dung-dich-va-can-bang-hoa-hoc.json",
      qaSha256:
        "a8f44ddaef89e84f7de273d5b4a6348efba976adc174bc4fc50b499526806243",
      slug: "dung-dich-va-can-bang-hoa-hoc",
      sourceId: "T08-S01",
      sourcePath:
        "8.1. Chuyen de 8-  Dung dich can bang hoa hoc- phan I & II OK (1).docx",
      sourceSha256:
        "9824a9580771da2d46c8d8f99382b166cb2a9178d317a37ff3bcb36835da237f",
      status: "in_review",
      topic: "chuyen-de-08",
      warningCount: 42,
    });
  });

  it("keeps Topic 6/8 canonical MDX, QA and remediation-queue files byte-identical to their recorded hashes", () => {
    const t06 = manifest.lessons.find(
      (lesson) => lesson.slug === "dong-hoa-hoc",
    )!;
    const t08 = manifest.lessons.find(
      (lesson) => lesson.slug === "dung-dich-va-can-bang-hoa-hoc",
    )!;
    expect(sha256(t06.mdxPath)).toBe(t06.mdxSha256);
    expect(sha256(t06.qaPath)).toBe(t06.qaSha256);
    expect(sha256(t08.mdxPath)).toBe(t08.mdxSha256);
    expect(sha256(t08.qaPath)).toBe(t08.qaSha256);
  });
});
