import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Intercept the MDX import so the test doesn't need a full MDX compiler; a
// missing/renamed import breaks this sentinel, which is the point.
vi.mock("./body.mdx", () => ({
  default: () => (
    <section data-testid="pilot-lesson-body">
      <h2>I. Tốc độ phản ứng</h2>
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
    expect(screen.getByText("T06-S01")).toBeInTheDocument();
    expect(screen.getByText(/96 mục chặn xuất bản/)).toBeInTheDocument();
  });
});
