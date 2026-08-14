import { cleanup, render, screen } from "@testing-library/react";
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
    expect(screen.getByText("T24-S01")).toBeInTheDocument();
    expect(screen.getByText(/0 mục chặn xuất bản/)).toBeInTheDocument();
    expect(screen.getByText(/3 cảnh báo/)).toBeInTheDocument();
  });
});
