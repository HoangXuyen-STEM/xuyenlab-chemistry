import { cleanup, render, screen } from "@testing-library/react";
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
    expect(screen.getByText("T02-S01")).toBeInTheDocument();
    expect(screen.getByText(/1 mục chặn xuất bản/)).toBeInTheDocument();
    expect(screen.getByText(/2 cảnh báo/)).toBeInTheDocument();
  });

  it("shows the draft staging banner, matching Topic 2's real manifest status (P6-B2.0)", () => {
    render(<PilotBangTuanHoanPage />);

    expect(screen.getByText(/BẢN NHÁP PILOT/)).toBeInTheDocument();
    expect(screen.queryByText(/BẢN ĐANG DUYỆT/)).not.toBeInTheDocument();
  });

  it("does not claim any accepted-with-limitation item, since the remediation queue is still pending-owner-review", () => {
    render(<PilotBangTuanHoanPage />);

    expect(
      screen.queryByRole("region", {
        name: "Giới hạn được Chủ dự án chấp nhận",
      }),
    ).not.toBeInTheDocument();
  });
});
