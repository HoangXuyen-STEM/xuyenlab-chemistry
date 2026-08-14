import { describe, expect, it } from "vitest";

import {
  loadRemediationQueueSummary,
  parseRemediationQueueSummary,
} from "./remediation-queue";

const acceptedTableItem = {
  issueId: "T24-S01:t6971",
  sourceId: "T24-S01",
  topic: "chuyen-de-24",
  lessonSlug: "phan-bon-hoa-hoc",
  kind: "table",
  status: "accepted-with-limitation",
  remediationChoice: "owner-accepted-source-fidelity",
  ownerDecision: {
    decidedBy: "Thầy Xuyên (Project Owner)",
    decidedAt: "2026-08-14",
    qaNote:
      "Owner compared the flattened table with the source DOCX table; representation retained unchanged.",
    altText: null,
    caption: null,
    reviewedLatex: null,
  },
};

const acceptedImageItem = {
  issueId: "T24-S01:i8191",
  sourceId: "T24-S01",
  topic: "chuyen-de-24",
  lessonSlug: "phan-bon-hoa-hoc",
  kind: "image",
  status: "accepted-with-limitation",
  remediationChoice: "owner-accepted-visible-fallback",
  ownerDecision: {
    decidedBy: "Thầy Xuyên (Project Owner)",
    decidedAt: "2026-08-14",
    qaNote:
      "Owner visually reviewed the existing fallback image and accepted it unchanged.",
    altText: null,
    caption: null,
    reviewedLatex: null,
  },
};

const teacherDiscussionPrompt = {
  issueId: "T24-S01:t6971",
  sourceId: "T24-S01",
  topic: "chuyen-de-24",
  lessonSlug: "phan-bon-hoa-hoc",
  kind: "table",
  status: "pending-owner-review",
  remediationChoice: null,
  ownerDecision: {
    decidedBy: null,
    decidedAt: null,
    qaNote: null,
    altText: null,
    caption: null,
    reviewedLatex: null,
  },
  discussionPrompt: {
    classification: "discussion-prompt",
    recordedBy: "Giáo viên phụ trách (declared)",
    recordedDate: "2026-08-14",
    promptOrObjective:
      "Học sinh so sánh cách trình bày bảng gốc và bảng đã chuyển đổi.",
    scientificStatus: "not-a-verified-scientific-conclusion",
    identityAssurance: "declared-not-authenticated",
  },
};

describe("parseRemediationQueueSummary", () => {
  it("derives an accepted table limitation with exact issue/source traceability", () => {
    const summary = parseRemediationQueueSummary(
      JSON.stringify([acceptedTableItem]),
    );
    expect(summary.acceptedLimitations).toEqual([
      {
        issueId: "T24-S01:t6971",
        sourceId: "T24-S01",
        kind: "table",
        remediationChoice: "owner-accepted-source-fidelity",
        qaNote: acceptedTableItem.ownerDecision.qaNote,
        decidedBy: "Thầy Xuyên (Project Owner)",
        decidedAt: "2026-08-14",
      },
    ]);
  });

  it("derives an accepted image fallback limitation with exact issue/source traceability", () => {
    const summary = parseRemediationQueueSummary(
      JSON.stringify([acceptedImageItem]),
    );
    expect(summary.acceptedLimitations).toEqual([
      {
        issueId: "T24-S01:i8191",
        sourceId: "T24-S01",
        kind: "image",
        remediationChoice: "owner-accepted-visible-fallback",
        qaNote: acceptedImageItem.ownerDecision.qaNote,
        decidedBy: "Thầy Xuyên (Project Owner)",
        decidedAt: "2026-08-14",
      },
    ]);
  });

  it("derives a teacher-recorded discussionPrompt with exact issue/source traceability", () => {
    const summary = parseRemediationQueueSummary(
      JSON.stringify([teacherDiscussionPrompt]),
    );
    expect(summary.discussionPrompts).toEqual([
      {
        issueId: "T24-S01:t6971",
        sourceId: "T24-S01",
        promptOrObjective:
          teacherDiscussionPrompt.discussionPrompt.promptOrObjective,
        recordedBy: "Giáo viên phụ trách (declared)",
        recordedDate: "2026-08-14",
        scientificStatus: "not-a-verified-scientific-conclusion",
        identityAssurance: "declared-not-authenticated",
      },
    ]);
  });

  it("skips a legacy pending-owner-review item (no accepted limitation, no discussion prompt)", () => {
    const summary = parseRemediationQueueSummary(
      JSON.stringify([
        { ...acceptedTableItem, status: "pending-owner-review" },
      ]),
    );
    expect(summary.acceptedLimitations).toEqual([]);
    expect(summary.discussionPrompts).toEqual([]);
  });

  it("fails safely (empty summary) on malformed JSON", () => {
    expect(parseRemediationQueueSummary("not json")).toEqual({
      acceptedLimitations: [],
      discussionPrompts: [],
    });
  });

  it("fails safely (empty summary) when the top level is not an array", () => {
    expect(
      parseRemediationQueueSummary(JSON.stringify({ not: "array" })),
    ).toEqual({
      acceptedLimitations: [],
      discussionPrompts: [],
    });
  });

  it("skips an accepted item missing a required field instead of throwing", () => {
    const { ownerDecision: _unused, ...withoutOwnerDecision } =
      acceptedTableItem;
    void _unused;
    const summary = parseRemediationQueueSummary(
      JSON.stringify([withoutOwnerDecision]),
    );
    expect(summary.acceptedLimitations).toEqual([]);
  });

  it("skips a discussionPrompt with the wrong scientificStatus/identityAssurance literal instead of throwing", () => {
    const summary = parseRemediationQueueSummary(
      JSON.stringify([
        {
          ...teacherDiscussionPrompt,
          discussionPrompt: {
            ...teacherDiscussionPrompt.discussionPrompt,
            identityAssurance: "authenticated",
          },
        },
      ]),
    );
    expect(summary.discussionPrompts).toEqual([]);
  });

  it("never claims a resolved/fixed/verified disposition in any derived field", () => {
    const summary = parseRemediationQueueSummary(
      JSON.stringify([acceptedTableItem, acceptedImageItem]),
    );
    const serialized = JSON.stringify(summary);
    for (const forbidden of ["resolved", "fixed", "verified", "published"]) {
      expect(serialized.toLowerCase()).not.toContain(forbidden);
    }
  });
});

describe("loadRemediationQueueSummary", () => {
  it("reads the derived queue path via the injected reader and returns its parsed summary", () => {
    const summary = loadRemediationQueueSummary(
      { topic: "chuyen-de-24", slug: "phan-bon-hoa-hoc" },
      (repositoryPath) => {
        expect(repositoryPath).toBe(
          "content/qa/pending/phan-bon-hoa-hoc.remediation-queue.json",
        );
        return JSON.stringify([acceptedTableItem]);
      },
    );
    expect(summary.acceptedLimitations).toHaveLength(1);
  });

  it("fails safely (empty summary) when the reader throws (missing file)", () => {
    const summary = loadRemediationQueueSummary(
      { topic: "chuyen-de-24", slug: "phan-bon-hoa-hoc" },
      () => {
        throw new Error("ENOENT");
      },
    );
    expect(summary).toEqual({ acceptedLimitations: [], discussionPrompts: [] });
  });

  it("fails safely (empty summary, no read attempted) for a malformed topic/slug", () => {
    let called = false;
    const summary = loadRemediationQueueSummary(
      { topic: "not-a-topic", slug: "phan-bon-hoa-hoc" },
      () => {
        called = true;
        return "[]";
      },
    );
    expect(called).toBe(false);
    expect(summary).toEqual({ acceptedLimitations: [], discussionPrompts: [] });
  });
});
