import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import type {
  AcceptedLimitation,
  DiscussionPromptEntry,
} from "@/features/content/remediation-queue";
import type { PilotLessonManifestEntry } from "@/features/content/pilot-manifest";

import { PilotLessonShell } from "./PilotLessonShell";

afterEach(cleanup);

// Real current status (docs/handoffs/P6/P6-B1.3-copilot.md): dong-hoa-hoc
// is already signed in_review, not draft -- the banner assertions below
// must match that, not the other way around.
const inReviewManifest: PilotLessonManifestEntry = {
  topic: "chuyen-de-06",
  slug: "dong-hoa-hoc",
  sourceId: "T06-S01",
  sourcePath: "6. Chuyen de 6. Dong hoa hoc.ok.docx",
  blockingCount: 96,
  warningCount: 3,
  status: "in_review",
};

// Real current status: phan-bon-hoa-hoc (Topic 24) is still draft as of
// P6-B1.3U. This fixture -- not a hardcoded assumption about which real
// lesson is draft -- is what the draft-banner test depends on, so it stays
// correct even after a future P6-B1.4 promotes the real Topic 24 lesson.
const draftManifest: PilotLessonManifestEntry = {
  topic: "chuyen-de-24",
  slug: "phan-bon-hoa-hoc",
  sourceId: "T24-S01",
  sourcePath: "24. Chuyen de 24_ Phan bon hoa hoc_OK.docx",
  blockingCount: 0,
  warningCount: 3,
  status: "draft",
};

describe("PilotLessonShell", () => {
  it("renders the in_review staging banner, provenance and QA counts without hiding them, for an in_review manifest", () => {
    render(
      <PilotLessonShell
        articleId="dong-hoa-hoc-body"
        lessonTitle="Động hóa học"
        manifest={inReviewManifest}
        summary="Bản pilot Phần I."
        topicTitle="Chuyên đề 6"
      >
        <p>Nội dung bài học.</p>
      </PilotLessonShell>,
    );

    expect(screen.getByText(/BẢN ĐANG DUYỆT/)).toBeInTheDocument();
    expect(screen.queryByText(/BẢN NHÁP PILOT/)).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: "Động hóa học" }),
    ).toBeInTheDocument();
    expect(screen.getByText("T06-S01")).toBeInTheDocument();
    expect(
      screen.getByText("6. Chuyen de 6. Dong hoa hoc.ok.docx"),
    ).toBeInTheDocument();
    expect(screen.getByText(/96 mục chặn xuất bản/)).toBeInTheDocument();
    expect(screen.getByText(/3 cảnh báo/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "In / Lưu PDF" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Nội dung bài học.")).toBeInTheDocument();
  });

  it("renders the draft staging banner, not the in_review one, for a draft manifest", () => {
    render(
      <PilotLessonShell
        articleId="phan-bon-hoa-hoc-body"
        lessonTitle="Phân bón hóa học"
        manifest={draftManifest}
        summary="Bản pilot Phần I."
        topicTitle="Chuyên đề 24"
      >
        <p>Nội dung bài học.</p>
      </PilotLessonShell>,
    );

    expect(screen.getByText(/BẢN NHÁP PILOT/)).toBeInTheDocument();
    expect(screen.queryByText(/BẢN ĐANG DUYỆT/)).not.toBeInTheDocument();
  });

  it("never labels an in_review lesson as published or approved", () => {
    render(
      <PilotLessonShell
        articleId="dong-hoa-hoc-body"
        lessonTitle="Động hóa học"
        manifest={inReviewManifest}
        summary="Bản pilot Phần I."
        topicTitle="Chuyên đề 6"
      >
        <p>Nội dung bài học.</p>
      </PilotLessonShell>,
    );

    const banner = screen.getByText(/BẢN ĐANG DUYỆT/);
    const text = banner.textContent ?? "";
    for (const forbidden of [
      "đã xuất bản",
      "đã phê duyệt",
      "approved",
      "published",
      "công khai",
    ]) {
      expect(text).not.toContain(forbidden);
    }
    expect(text).toContain("chưa xuất bản");
  });

  it("links back to the pilot index", () => {
    render(
      <PilotLessonShell
        articleId="dong-hoa-hoc-body"
        lessonTitle="Động hóa học"
        manifest={inReviewManifest}
        summary="Bản pilot Phần I."
        topicTitle="Chuyên đề 6"
      >
        <p>Nội dung bài học.</p>
      </PilotLessonShell>,
    );

    expect(
      screen.getByRole("link", { name: "Danh sách pilot" }),
    ).toHaveAttribute("href", "/fixtures/pilot");
  });

  it("shows the staging limitation notice as a labelled note, visible without any accepted items, regardless of lifecycle status", () => {
    render(
      <PilotLessonShell
        articleId="dong-hoa-hoc-body"
        lessonTitle="Động hóa học"
        manifest={inReviewManifest}
        summary="Bản pilot Phần I."
        topicTitle="Chuyên đề 6"
      >
        <p>Nội dung bài học.</p>
      </PilotLessonShell>,
    );

    expect(
      screen.getByRole("note", { name: "Lưu ý bản đang duyệt" }),
    ).toHaveTextContent(/sử dụng dưới hướng dẫn giáo viên/u);
    // No accepted-limitations/discussionPrompt props were passed, so those
    // sections must not render at all -- only the page-level notice does.
    expect(
      screen.queryByRole("heading", {
        name: "Giới hạn được Chủ dự án chấp nhận",
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Câu hỏi thảo luận trên lớp" }),
    ).not.toBeInTheDocument();
  });

  it("renders synthetic accepted limitations and discussion prompts passed in as props", () => {
    const acceptedLimitations: AcceptedLimitation[] = [
      {
        issueId: "T06-S01:t2740",
        sourceId: "T06-S01",
        kind: "table",
        remediationChoice: "owner-accepted-source-fidelity",
        qaNote: "Synthetic qaNote for a component test.",
        decidedBy: "Thầy Xuyên (Project Owner)",
        decidedAt: "2026-08-14",
      },
    ];
    const discussionPrompts: DiscussionPromptEntry[] = [
      {
        issueId: "T06-S01:t2740",
        sourceId: "T06-S01",
        promptOrObjective:
          "Synthetic discussion objective for a component test.",
        recordedBy: "Giáo viên phụ trách (declared)",
        recordedDate: "2026-08-14",
        scientificStatus: "not-a-verified-scientific-conclusion",
        identityAssurance: "declared-not-authenticated",
      },
    ];

    render(
      <PilotLessonShell
        acceptedLimitations={acceptedLimitations}
        articleId="dong-hoa-hoc-body"
        discussionPrompts={discussionPrompts}
        lessonTitle="Động hóa học"
        manifest={inReviewManifest}
        summary="Bản pilot Phần I."
        topicTitle="Chuyên đề 6"
      >
        <p>Nội dung bài học.</p>
      </PilotLessonShell>,
    );

    expect(
      screen.getByRole("heading", {
        name: "Giới hạn được Chủ dự án chấp nhận",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Câu hỏi thảo luận trên lớp" }),
    ).toBeInTheDocument();
    // Both new sections trace back to the same synthetic issueId; sourceId
    // "T06-S01" also appears once more in the shell's own provenance line,
    // so that one has 3 occurrences instead of 2.
    expect(screen.getAllByText("T06-S01:t2740")).toHaveLength(2);
    expect(screen.getAllByText("T06-S01")).toHaveLength(3);
  });
});
