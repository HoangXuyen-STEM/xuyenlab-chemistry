import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Intercept the MDX import so the test doesn't need a full MDX compiler; a
// missing/renamed import breaks this sentinel, which is the point.
vi.mock("./body.mdx", () => ({
  default: () => (
    <section data-testid="pilot-lesson-body">
      <h2>I. CẤU TẠO BẢNG TUẦN HOÀN CÁC NGUYÊN TỐ HÓA HỌC</h2>
    </section>
  ),
}));

import PilotBangTuanHoanPage from "./page";

afterEach(cleanup);

describe("PilotBangTuanHoanPage", () => {
  it("renders the staging shell around the imported lesson body", () => {
    render(<PilotBangTuanHoanPage />);

    expect(screen.getByRole("heading", { level: 1 }).textContent).toMatch(
      /Bảng tuần hoàn/,
    );
    expect(screen.getByTestId("pilot-lesson-body")).toBeInTheDocument();
    // "T02-S01" now also appears in each of the two real accepted-limitation
    // items' own provenance line (P6-B2.2), not just the header's, so this
    // checks presence rather than a single unique match.
    expect(screen.getAllByText("T02-S01").length).toBeGreaterThan(0);
    expect(screen.getByText(/1 mục chặn xuất bản/)).toBeInTheDocument();
    expect(screen.getByText(/2 cảnh báo/)).toBeInTheDocument();
  });

  it("shows the in_review staging banner, matching Topic 2's real signed manifest status (P6-B2.2)", () => {
    render(<PilotBangTuanHoanPage />);

    expect(screen.getByText(/BẢN ĐANG DUYỆT/)).toBeInTheDocument();
    expect(screen.queryByText(/BẢN NHÁP PILOT/)).not.toBeInTheDocument();
  });

  it("shows both real accepted-with-limitation items (image, table) from the canonical remediation queue", () => {
    render(<PilotBangTuanHoanPage />);

    const section = screen.getByRole("region", {
      name: "Giới hạn được Chủ dự án chấp nhận",
    });
    for (const issueId of ["T02-S01:i6022", "T02-S01:t7931"]) {
      expect(within(section).getByText(issueId)).toBeInTheDocument();
    }
  });

  it("does not claim the still-blocking drawing as an accepted-with-limitation item", () => {
    render(<PilotBangTuanHoanPage />);

    // The mocked body.mdx above stands in for the compiled MDX (including
    // the drawing's own blocking Callout), so this only proves the drawing
    // is absent from the accepted-limitations section specifically; the
    // Callout's own visibility is covered by tests/e2e/pilot-staging.spec.ts
    // against the real, unmocked page.
    const section = screen.getByRole("region", {
      name: "Giới hạn được Chủ dự án chấp nhận",
    });
    expect(
      within(section).queryByText("T02-S01:d1402"),
    ).not.toBeInTheDocument();
  });

  it("never claims the retained image placeholder gained semantic alt text or accessibility remediation", () => {
    render(<PilotBangTuanHoanPage />);

    const section = screen.getByRole("region", {
      name: "Giới hạn được Chủ dự án chấp nhận",
    });
    const text = section.textContent ?? "";
    expect(text).toContain(
      "chưa có mô tả thay thế (alt text) mới hay cải thiện khả năng tiếp cận nào được thêm vào",
    );
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
