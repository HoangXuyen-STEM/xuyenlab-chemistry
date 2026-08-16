import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Intercept the MDX import so the test doesn't need a full MDX compiler; a
// missing/renamed import breaks this sentinel, which is the point.
vi.mock("./body.mdx", () => ({
  default: () => (
    <section data-testid="pilot-lesson-body">
      <h2>1. Tốc độ phản ứng</h2>
    </section>
  ),
}));

import PilotDongHoaHocPage from "./page";

afterEach(cleanup);

describe("PilotDongHoaHocPage", () => {
  it("renders the staging shell around the imported lesson body", () => {
    render(<PilotDongHoaHocPage />);

    expect(screen.getByRole("heading", { level: 1 }).textContent).toMatch(
      /Động hóa học/,
    );
    expect(screen.getByTestId("pilot-lesson-body")).toBeInTheDocument();
    // "T06-S01" also appears in each accepted-limitation provenance line
    // after P6 A1 (3 tables), so check presence rather than uniqueness.
    expect(screen.getAllByText("T06-S01").length).toBeGreaterThan(0);
    expect(screen.getByText(/96 mục chặn xuất bản/)).toBeInTheDocument();
    expect(screen.getByText(/3 cảnh báo/)).toBeInTheDocument();
  });

  it("shows all three Owner A1 accepted-with-limitation table items", () => {
    render(<PilotDongHoaHocPage />);

    const section = screen.getByRole("region", {
      name: "Giới hạn được Chủ dự án chấp nhận",
    });
    for (const issueId of ["T06-S01:t3041", "T06-S01:t2740", "T06-S01:t6560"]) {
      expect(within(section).getByText(issueId)).toBeInTheDocument();
    }
  });
});
