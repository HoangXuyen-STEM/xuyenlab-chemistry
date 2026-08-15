import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Intercept the MDX import so the test doesn't need a full MDX compiler; a
// missing/renamed import breaks this sentinel, which is the point.
vi.mock("./body.mdx", () => ({
  default: () => (
    <section data-testid="pilot-lesson-body">
      <h2>1. Khái niệm và phân loại</h2>
    </section>
  ),
}));

import PilotPhanBonHoaHocPage from "./page";

afterEach(cleanup);

describe("PilotPhanBonHoaHocPage", () => {
  it("renders the staging shell around the imported lesson body", () => {
    render(<PilotPhanBonHoaHocPage />);

    expect(screen.getByRole("heading", { level: 1 }).textContent).toMatch(
      /Phân bón hóa học/,
    );
    expect(screen.getByTestId("pilot-lesson-body")).toBeInTheDocument();
    // "T24-S01" now also appears in each of the three real accepted-limitation
    // items' own provenance line (P6-B1.4), not just the header's, so this
    // checks presence rather than a single unique match.
    expect(screen.getAllByText("T24-S01").length).toBeGreaterThan(0);
    expect(screen.getByText(/0 mục chặn xuất bản/)).toBeInTheDocument();
    expect(screen.getByText(/3 cảnh báo/)).toBeInTheDocument();
  });

  it("shows the in_review staging banner, matching Topic 24's real signed manifest status (P6-B1.4)", () => {
    render(<PilotPhanBonHoaHocPage />);

    expect(screen.getByText(/BẢN ĐANG DUYỆT/)).toBeInTheDocument();
    expect(screen.queryByText(/BẢN NHÁP PILOT/)).not.toBeInTheDocument();
  });

  it("shows all three real accepted-with-limitation items from the canonical remediation queue", () => {
    render(<PilotPhanBonHoaHocPage />);

    const section = screen.getByRole("region", {
      name: "Giới hạn được Chủ dự án chấp nhận",
    });
    for (const issueId of ["T24-S01:t6971", "T24-S01:i8191", "T24-S01:i0305"]) {
      expect(within(section).getByText(issueId)).toBeInTheDocument();
    }
  });

  it("never claims the retained image placeholder gained semantic alt text or accessibility remediation", () => {
    render(<PilotPhanBonHoaHocPage />);

    const section = screen.getByRole("region", {
      name: "Giới hạn được Chủ dự án chấp nhận",
    });
    const text = section.textContent ?? "";
    expect(text).toContain(
      "chưa có mô tả thay thế (alt text) mới hay cải thiện khả năng tiếp cận nào được thêm vào",
    );
    // Note: "verified" itself legitimately appears (the Owner "visually
    // verified" the source image) -- these check for a false claim that the
    // *content/accessibility* was fixed or resolved, not for the Owner's own
    // review action.
    for (const forbidden of [
      "resolved",
      "fixed",
      "accessibility improved",
      "published",
      "đã sửa",
      "đã khắc phục",
      "đã cải thiện khả năng tiếp cận",
      "đã xuất bản",
    ]) {
      expect(text.toLowerCase()).not.toContain(forbidden.toLowerCase());
    }
  });
});
