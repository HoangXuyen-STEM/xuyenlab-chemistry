import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Intercept the MDX import so the test doesn't need a full MDX compiler; a
// missing/renamed import breaks this sentinel, which is the point.
vi.mock("./body.mdx", () => ({
  default: () => (
    <section data-testid="pilot-lesson-body">
      <h2>Cân bằng hóa học</h2>
    </section>
  ),
}));

import PilotDungDichVaCanBangHoaHocPage from "./page";

afterEach(cleanup);

describe("PilotDungDichVaCanBangHoaHocPage", () => {
  it("renders the staging shell around the imported lesson body", () => {
    render(<PilotDungDichVaCanBangHoaHocPage />);

    expect(screen.getByRole("heading", { level: 1 }).textContent).toMatch(
      /Dung dịch và cân bằng hóa học/,
    );
    expect(screen.getByTestId("pilot-lesson-body")).toBeInTheDocument();
    expect(screen.getByText("T08-S01")).toBeInTheDocument();
    expect(screen.getByText(/126 mục chặn xuất bản/)).toBeInTheDocument();
    expect(screen.getByText(/42 cảnh báo/)).toBeInTheDocument();
  });
});
