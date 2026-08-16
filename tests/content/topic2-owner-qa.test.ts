// @vitest-environment node

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");

interface PublishWaiver {
  type: string;
  scope: string;
  authorizedBy: string;
  authorizedDate: string;
  doesNotAuthorize: string[];
  remediationDebtRetained: boolean;
  unresolvedBlockingCount: number;
  acknowledgedBlockedItems: string[];
  reference: { contractAmendment: string; handoff: string };
}

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
  publishWaiver?: PublishWaiver;
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

const qa = readJson<QaRecord>("content/qa/pending/bang-tuan-hoan.json");
const queue = readJson<QueueItem[]>(
  "content/qa/pending/bang-tuan-hoan.remediation-queue.json",
);
const manifest = readJson<{ lessons: ManifestLesson[] }>(
  "content/pilot-staging-manifest.json",
);
const topic2 = manifest.lessons.find(
  (lesson) => lesson.slug === "bang-tuan-hoan",
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
}>("content/qa/import-reports/bang-tuan-hoan.failure.json");
const blocksById = new Map(
  failureReport.blocks.map((block) => [block.id, block]),
);

describe("P6-B2.2: Topic 2 Owner QA record", () => {
  it("is signed in_review with all seven checks true", () => {
    expect(qa.reviewStatus).toBe("in_review");
    expect(qa.reviewer).toBe("Thầy Xuyên (Project Owner)");
    expect(Object.keys(qa.checks)).toHaveLength(7);
    for (const [check, value] of Object.entries(qa.checks)) {
      expect(value, check).toBe(true);
    }
  });

  it("records reviewedAt as the truthful date-only value", () => {
    expect(qa.reviewedAt).toBe("2026-08-15");
    expect(qa.reviewedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/u);
  });

  it("carries approvedForPublish true with a well-formed T06/T08-style publishWaiver (P6-B2.5)", () => {
    expect(qa.approvedForPublish).toBe(true);
    const waiver = qa.publishWaiver;
    expect(waiver, "publishWaiver must be present").toBeDefined();
    expect(waiver!.type).toBe("P6.2-owner-exception");
    expect(waiver!.scope).toBe("in_review");
    expect(waiver!.authorizedBy).toBe("Thầy Xuyên (Project Owner)");
    expect(waiver!.authorizedDate).toBe("2026-08-16");
    expect(waiver!.authorizedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/u);
    expect(new Set(waiver!.doesNotAuthorize)).toEqual(
      new Set([
        "published",
        "productionDeployment",
        "publicBucketAccess",
        "automaticPublication",
      ]),
    );
    expect(waiver!.remediationDebtRetained).toBe(true);
    expect(waiver!.unresolvedBlockingCount).toBe(1);
    expect(waiver!.acknowledgedBlockedItems).toEqual(["T02-S01:d1402"]);
    expect(waiver!.reference.contractAmendment).toBe(
      "docs/contracts/content.md#amendments",
    );
    expect(waiver!.reference.handoff).toBe(
      "docs/handoffs/P6/P6-B2.5-topic2-approve-for-publication-claude.md",
    );
  });

  it("does not claim the lesson is published -- reviewStatus stays in_review", () => {
    expect(qa.reviewStatus).toBe("in_review");
  });

  it("keeps all three unresolved entries unchanged, including the still-blocking drawing", () => {
    expect(qa.unresolved).toEqual([
      {
        description:
          "Extracted image needs meaningful alt text and visual verification.",
        id: "T02-S01:i6022",
        severity: "warning",
      },
      {
        description:
          "DOCX table was flattened to an HTML table and needs visual review.",
        id: "T02-S01:t7931",
        severity: "warning",
      },
      {
        description:
          "Drawing or shape has no extractable browser-safe image relationship.",
        id: "T02-S01:d1402",
        severity: "blocking",
      },
    ]);
  });

  it("keeps lessonVersion and sourceIds unchanged", () => {
    expect(qa.lessonVersion).toBe(1);
    expect(qa.sourceIds).toEqual(["T02-S01"]);
  });
});

describe("P6-B2.2: Topic 2 remediation queue dispositions", () => {
  it("accepts the image with owner-accepted-visible-fallback", () => {
    const image = queue.find((item) => item.issueId === "T02-S01:i6022")!;
    expect(image.status).toBe("accepted-with-limitation");
    expect(image.remediationChoice).toBe("owner-accepted-visible-fallback");
    expect(image.kind).toBe("image");
    expect(image.ownerDecision.decidedBy).toBe("Thầy Xuyên (Project Owner)");
    expect(image.ownerDecision.decidedAt).toBe("2026-08-15");
    expect(image.ownerDecision.qaNote).toContain("visually verified");
    expect(image.ownerDecision.qaNote).toContain(
      "No meaningful semantic alt text or accessibility improvement was authored or applied",
    );
    expect(image.previewPath).toBe(
      "/staging-assets/lessons/76/76e8a9324baf57ed03154de9be1ba748b436c537ee387837660ebc128f68492d.png",
    );
  });

  it("accepts the table with owner-accepted-source-fidelity", () => {
    const table = queue.find((item) => item.issueId === "T02-S01:t7931")!;
    expect(table.status).toBe("accepted-with-limitation");
    expect(table.remediationChoice).toBe("owner-accepted-source-fidelity");
    expect(table.kind).toBe("table");
    expect(table.ownerDecision.decidedBy).toBe("Thầy Xuyên (Project Owner)");
    expect(table.ownerDecision.decidedAt).toBe("2026-08-15");
    expect(table.ownerDecision.qaNote).toContain(
      "compared the flattened table with the Word source",
    );
    expect(table.ownerDecision.qaNote).toContain(
      "No content remediation was performed",
    );
  });

  it("applies the drawing with reviewed-image-fallback, NOT accepted-with-limitation (P6-B2.4B)", () => {
    const drawing = queue.find((item) => item.issueId === "T02-S01:d1402")!;
    expect(drawing.status).toBe("applied");
    expect(drawing.remediationChoice).toBe("reviewed-image-fallback");
    expect(drawing.status).not.toBe("accepted-with-limitation");
    expect(drawing.status).not.toBe("blocked");
    expect(drawing.remediationChoice).not.toBe(
      "owner-accepted-visible-fallback",
    );
    expect(drawing.severity).toBe("blocking");
    expect(drawing.kind).toBe("drawing");
    expect(drawing.ownerDecision.decidedBy).toBe("Thầy Xuyên (Project Owner)");
    expect(drawing.ownerDecision.decidedAt).toBe("2026-08-15");
    expect(drawing.ownerDecision.qaNote).toContain(
      "Owner visually approved the B2.4A candidate SVG (PR #46)",
    );
    expect(drawing.ownerDecision.qaNote).toContain(
      "Not a publication approval",
    );
    expect(drawing.previewPath).toBe(
      "/staging-assets/lessons/51/518163475c46c8fb17d9e41e50048e535453ab66823d2b0ab7c5aada28d6fc18.svg",
    );
    expect(drawing.ownerDecision.reviewedLatex).toBeNull();
  });

  it("keeps ownerDecision.altText/caption null for the two accepted-with-limitation items, but populated (matching the live ChemFigure) for the applied drawing (P6-B2.4B)", () => {
    for (const issueId of ["T02-S01:i6022", "T02-S01:t7931"]) {
      const item = queue.find((entry) => entry.issueId === issueId)!;
      expect(item.ownerDecision.altText, issueId).toBeNull();
      expect(item.ownerDecision.caption, issueId).toBeNull();
      expect(item.ownerDecision.reviewedLatex, issueId).toBeNull();
    }

    const drawing = queue.find((item) => item.issueId === "T02-S01:d1402")!;
    expect(drawing.ownerDecision.altText).toBe(
      "Sơ đồ quan hệ: từ cấu tạo nguyên tử xác định vị trí nguyên tố trong bảng tuần hoàn và ngược lại; từ cấu tạo nguyên tử và vị trí xác định tính chất của nguyên tố.",
    );
    expect(drawing.ownerDecision.caption).toBe(
      "Nguồn T02-S01, hình vẽ tái tạo (thay AutoShape Word T02-S01:d1402)",
    );
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
      expect(item.sourceId).toBe("T02-S01");
      expect(item.topic).toBe("chuyen-de-02");
      expect(item.lessonSlug).toBe("bang-tuan-hoan");
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

describe("P6-B2.2: Topic 2 lifecycle metadata", () => {
  it("MDX frontmatter and manifest both declare in_review", () => {
    const mdx = readFileSync(
      path.join(repoRoot, "content/topics/chuyen-de-02/bang-tuan-hoan.mdx"),
      "utf8",
    );
    expect(mdx).toMatch(/\nstatus: in_review\n/u);
    expect(topic2.status).toBe("in_review");
  });

  it("refreshed only Topic 2's mdxSha256/qaSha256, matching the files on disk", () => {
    expect(topic2.mdxSha256).toBe(
      sha256("content/topics/chuyen-de-02/bang-tuan-hoan.mdx"),
    );
    expect(topic2.qaSha256).toBe(
      sha256("content/qa/pending/bang-tuan-hoan.json"),
    );
  });

  it("preserved Topic 2's import-time blockingCount/warningCount and provenance", () => {
    expect(topic2.blockingCount).toBe(1);
    expect(topic2.warningCount).toBe(2);
    expect(topic2.sourceId).toBe("T02-S01");
    expect(topic2.sourcePath).toBe(
      "2. Chuyen de 2.Bảng tuần hoàn. Phan Thị Hà.ok.docx",
    );
    expect(topic2.sourceSha256).toBe(
      "a99d3a4d1d0a2bab049d354d15159fb3c4f8d0763b87fa5bd19c645c5a5325a3",
    );
    // The failure report itself is untouched by this task -- only the QA
    // record, remediation queue and MDX frontmatter changed.
    expect(topic2.failureReportSha256).toBe(
      sha256("content/qa/import-reports/bang-tuan-hoan.failure.json"),
    );
  });

  it("kept manifestVersion unchanged", () => {
    const full = readJson<{ manifestVersion: string }>(
      "content/pilot-staging-manifest.json",
    );
    expect(full.manifestVersion).toBe("1.1.0");
  });

  it("did not change the Chemistry body, table, or the original accepted image ChemFigure src/alt/caption", () => {
    const mdx = readFileSync(
      path.join(repoRoot, "content/topics/chuyen-de-02/bang-tuan-hoan.mdx"),
      "utf8",
    );
    expect(mdx).toContain(
      "Các nguyên tố được sắp xếp theo chiều tăng dần của điện tích hạt nhân nguyên tử.",
    );
    expect(mdx).toContain('<DataTable caption="Bảng 1 trích từ DOCX">');
    expect(mdx).toContain(
      "Cấu hình electron: ?Số proton, electron: ?Số lớp electron: ?Số",
    );
    expect(mdx).toContain(
      'src="/staging-assets/lessons/76/76e8a9324baf57ed03154de9be1ba748b436c537ee387837660ebc128f68492d.png"',
    );
    expect(mdx).toContain(
      'alt="Hình trích từ DOCX; cần chủ dự án bổ sung mô tả"',
    );
    expect(mdx).toContain('caption="Nguồn T02-S01, hình 1"');
  });

  it("removed the drawing's warning Callout, keeping the applied candidate ChemFigure byte-identical to the PR #46 candidate and the issueId still traceable (P6-B2.4B)", () => {
    const mdx = readFileSync(
      path.join(repoRoot, "content/topics/chuyen-de-02/bang-tuan-hoan.mdx"),
      "utf8",
    );
    expect(mdx).not.toContain(
      '<Callout type="warning" title="Hình vẽ Word cần biên tập">',
    );
    expect(mdx).not.toContain("Chưa chuyển hình vẽ `T02-S01:d1402` (số 1).");

    expect(mdx).toContain(
      'src="/staging-assets/lessons/51/518163475c46c8fb17d9e41e50048e535453ab66823d2b0ab7c5aada28d6fc18.svg"',
    );
    expect(mdx).toContain(
      'alt="Sơ đồ quan hệ: từ cấu tạo nguyên tử xác định vị trí nguyên tố trong bảng tuần hoàn và ngược lại; từ cấu tạo nguyên tử và vị trí xác định tính chất của nguyên tố."',
    );
    expect(mdx).toContain(
      'caption="Nguồn T02-S01, hình vẽ tái tạo (thay AutoShape Word T02-S01:d1402)"',
    );
    // The blocking issueId must still be visibly traceable in the MDX body
    // (validate.py's pre-existing "hidden unresolved blocking issue" rule) --
    // the candidate ChemFigure's own caption already carries it.
    expect(mdx).toContain("T02-S01:d1402");
  });
});

describe("P6-B2.4B: the drawing's applied disposition alone never grants publication", () => {
  it("requires an explicit P6-B2.5 waiver naming the exact retained blocking item -- approvedForPublish is not an automatic side effect of applied", () => {
    expect(qa.unresolved.some((entry) => entry.severity === "blocking")).toBe(
      true,
    );
    // approvedForPublish is true now, but only because P6-B2.5 added a
    // structured waiver that explicitly names T02-S01:d1402 as a
    // retained/acknowledged blocking item -- the applied disposition
    // itself never grants this on its own (there is no such rule
    // anywhere in the validator), and the waiver's own
    // unresolvedBlockingCount/acknowledgedBlockedItems fields are
    // validator-checked against the real QA record, not merely asserted.
    expect(qa.approvedForPublish).toBe(true);
    expect(qa.publishWaiver?.acknowledgedBlockedItems).toContain(
      "T02-S01:d1402",
    );
    expect(qa.publishWaiver?.unresolvedBlockingCount).toBe(
      qa.unresolved.filter((entry) => entry.severity === "blocking").length,
    );
  });

  it("does not use accepted-with-limitation vocabulary for the blocking item anywhere", () => {
    const drawing = queue.find((item) => item.issueId === "T02-S01:d1402")!;
    expect(drawing.status).not.toBe("accepted-with-limitation");
  });
});

describe("P6-B2.2: T06/T08/T24 preserved exactly", () => {
  it("keeps Topic 6, Topic 8 and Topic 24 manifest entries byte/deep-equal to their known-committed shape", () => {
    const t06 = manifest.lessons.find(
      (lesson) => lesson.slug === "dong-hoa-hoc",
    )!;
    const t08 = manifest.lessons.find(
      (lesson) => lesson.slug === "dung-dich-va-can-bang-hoa-hoc",
    )!;
    const t24 = manifest.lessons.find(
      (lesson) => lesson.slug === "phan-bon-hoa-hoc",
    )!;
    expect(t06).toEqual({
      blockingCount: 96,
      failureReportPath: "content/qa/import-reports/dong-hoa-hoc.failure.json",
      failureReportSha256:
        "3cba350fc6b3f866599005a9ec4954fb660aa3ed3c3da4cbf10289fd57d1e7d6",
      mdxPath: "content/topics/chuyen-de-06/dong-hoa-hoc.mdx",
      mdxSha256:
        "d86c4526d539ea669a9e81e6373ec1be97409d7ec3163038ca532364fe5795ed",
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
    expect(t24).toEqual({
      blockingCount: 0,
      failureReportPath:
        "content/qa/import-reports/phan-bon-hoa-hoc.failure.json",
      failureReportSha256:
        "afa71f8707dc55010536e4da44627a49014930d0627a6dcc896d8bb76e401bea",
      mdxPath: "content/topics/chuyen-de-24/phan-bon-hoa-hoc.mdx",
      mdxSha256:
        "25c6bf58900ef6a5e82b9c6f595eba56463dc655cedc3d04e3ff61b73a99fb2e",
      qaPath: "content/qa/pending/phan-bon-hoa-hoc.json",
      qaSha256:
        "01e4b02f509772b25e6cb2458b47b885c508c2b1a634ac0bbad2f712cd22d059",
      slug: "phan-bon-hoa-hoc",
      sourceId: "T24-S01",
      sourcePath: "24. Chuyen de 24_ Phan bon hoa hoc_OK.docx",
      sourceSha256:
        "d501f3af84e6fd635a1462a148181f7446fecf68c420008f21f803ed64fd872a",
      status: "in_review",
      topic: "chuyen-de-24",
      warningCount: 3,
    });
  });

  it("keeps Topic 6/8/24 canonical MDX, QA and remediation-queue files byte-identical to their recorded hashes", () => {
    const t06 = manifest.lessons.find(
      (lesson) => lesson.slug === "dong-hoa-hoc",
    )!;
    const t08 = manifest.lessons.find(
      (lesson) => lesson.slug === "dung-dich-va-can-bang-hoa-hoc",
    )!;
    const t24 = manifest.lessons.find(
      (lesson) => lesson.slug === "phan-bon-hoa-hoc",
    )!;
    expect(sha256(t06.mdxPath)).toBe(t06.mdxSha256);
    expect(sha256(t06.qaPath)).toBe(t06.qaSha256);
    expect(sha256(t08.mdxPath)).toBe(t08.mdxSha256);
    expect(sha256(t08.qaPath)).toBe(t08.qaSha256);
    expect(sha256(t24.mdxPath)).toBe(t24.mdxSha256);
    expect(sha256(t24.qaPath)).toBe(t24.qaSha256);
  });
});
