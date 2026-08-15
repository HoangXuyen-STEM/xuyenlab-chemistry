import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import type { DiscussionPromptEntry } from "@/features/content/remediation-queue";

import { DiscussionPrompts } from "./DiscussionPrompts";

afterEach(cleanup);

const teacherPrompt: DiscussionPromptEntry = {
  issueId: "T24-S01:t6971",
  sourceId: "T24-S01",
  promptOrObjective:
    "Học sinh so sánh cách trình bày bảng gốc và bảng đã chuyển đổi.",
  recordedBy: "Giáo viên phụ trách (declared)",
  recordedDate: "2026-08-14",
  scientificStatus: "not-a-verified-scientific-conclusion",
  identityAssurance: "declared-not-authenticated",
};

describe("DiscussionPrompts", () => {
  it("renders nothing when there are no discussion prompts", () => {
    const { container } = render(<DiscussionPrompts items={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the objective, exact issue/source provenance, and recordedBy/recordedDate for a declared teacher identity", () => {
    render(<DiscussionPrompts items={[teacherPrompt]} />);

    const section = screen.getByRole("region", {
      name: "Câu hỏi thảo luận trên lớp",
    });
    expect(
      within(section).getByText(teacherPrompt.promptOrObjective),
    ).toBeInTheDocument();
    expect(within(section).getByText("T24-S01:t6971")).toBeInTheDocument();
    expect(within(section).getByText("T24-S01")).toBeInTheDocument();
    expect(
      within(section).getByText(/Giáo viên phụ trách \(declared\)/u),
    ).toBeInTheDocument();
    expect(within(section).getByText(/2026-08-14/u)).toBeInTheDocument();
  });

  it("shows the exact required scientificStatus meaning", () => {
    render(<DiscussionPrompts items={[teacherPrompt]} />);
    expect(
      screen.getByText("Không phải kết luận khoa học đã được xác minh."),
    ).toBeInTheDocument();
  });

  it("shows the exact required declared-identity warning", () => {
    render(<DiscussionPrompts items={[teacherPrompt]} />);
    expect(
      screen.getByText(
        "Danh tính khai báo; chưa được xác thực bằng tài khoản.",
      ),
    ).toBeInTheDocument();
  });

  it("does not require a Project Owner identity -- a declared teacher recordedBy renders identically", () => {
    render(<DiscussionPrompts items={[teacherPrompt]} />);
    expect(screen.queryByText(/Chủ dự án/u)).not.toBeInTheDocument();
    expect(screen.getByText(/Giáo viên phụ trách/u)).toBeInTheDocument();
  });
});
