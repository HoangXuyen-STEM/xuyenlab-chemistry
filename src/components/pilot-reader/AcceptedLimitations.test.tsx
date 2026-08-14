import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import type { AcceptedLimitation } from "@/features/content/remediation-queue";

import { AcceptedLimitations } from "./AcceptedLimitations";

afterEach(cleanup);

const tableItem: AcceptedLimitation = {
  issueId: "T24-S01:t6971",
  sourceId: "T24-S01",
  kind: "table",
  remediationChoice: "owner-accepted-source-fidelity",
  qaNote:
    "Owner compared the flattened table with the source DOCX table; representation retained unchanged.",
  decidedBy: "Thầy Xuyên (Project Owner)",
  decidedAt: "2026-08-14",
};

const imageItem: AcceptedLimitation = {
  issueId: "T24-S01:i8191",
  sourceId: "T24-S01",
  kind: "image",
  remediationChoice: "owner-accepted-visible-fallback",
  qaNote:
    "Owner visually reviewed the existing fallback image and accepted it unchanged.",
  decidedBy: "Thầy Xuyên (Project Owner)",
  decidedAt: "2026-08-14",
};

describe("AcceptedLimitations", () => {
  it("renders nothing when there are no accepted items", () => {
    const { container } = render(<AcceptedLimitations items={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the limitation type, exact issueId/sourceId and the truthful Owner qaNote", () => {
    render(<AcceptedLimitations items={[tableItem]} />);

    const section = screen.getByRole("region", {
      name: "Giới hạn được Chủ dự án chấp nhận",
    });
    expect(within(section).getByText("T24-S01:t6971")).toBeInTheDocument();
    expect(within(section).getByText("T24-S01")).toBeInTheDocument();
    expect(within(section).getByText(tableItem.qaNote)).toBeInTheDocument();
  });

  it("states the item is retained from source and not a new system-verified scientific conclusion", () => {
    render(<AcceptedLimitations items={[tableItem]} />);
    expect(
      screen.getByText(
        /không phải nội dung khoa học mới do hệ thống xác nhận/u,
      ),
    ).toBeInTheDocument();
  });

  it("does not claim meaningful alt text or accessibility remediation was added for an image fallback", () => {
    render(<AcceptedLimitations items={[imageItem]} />);

    const section = screen.getByRole("region", {
      name: "Giới hạn được Chủ dự án chấp nhận",
    });
    const text = section.textContent ?? "";
    expect(text).toContain("chưa có mô tả thay thế");
    expect(text).toContain(
      "chưa có mô tả thay thế (alt text) mới hay cải thiện khả năng tiếp cận nào được thêm vào",
    );
  });

  it("never uses misleading resolved/fixed/verified/published copy anywhere in the section", () => {
    render(<AcceptedLimitations items={[tableItem, imageItem]} />);

    const section = screen.getByRole("region", {
      name: "Giới hạn được Chủ dự án chấp nhận",
    });
    const text = (section.textContent ?? "").toLowerCase();
    for (const forbidden of [
      "đã sửa",
      "đã khắc phục",
      "đã xác minh",
      "đã xuất bản",
      "resolved",
      "fixed",
    ]) {
      expect(text).not.toContain(forbidden);
    }
  });

  it("renders one item per issueId, keyed distinctly", () => {
    render(<AcceptedLimitations items={[tableItem, imageItem]} />);
    expect(screen.getByText("T24-S01:t6971")).toBeInTheDocument();
    expect(screen.getByText("T24-S01:i8191")).toBeInTheDocument();
  });
});
