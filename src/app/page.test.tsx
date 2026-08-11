import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import HomePage from "./page";

describe("HomePage", () => {
  it("shows the Phase 1 foundation status", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("heading", {
        name: "Nền tảng ứng dụng đã sẵn sàng",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Sẵn sàng cho CI và UX spec")).toBeVisible();
  });
});
