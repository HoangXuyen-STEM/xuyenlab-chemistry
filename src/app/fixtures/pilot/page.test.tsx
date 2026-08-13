import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import PilotIndexPage from "./page";

afterEach(cleanup);

describe("PilotIndexPage", () => {
  it("links to both pilot lesson routes without requiring login", () => {
    render(<PilotIndexPage />);

    expect(screen.getByRole("link", { name: "dong-hoa-hoc" })).toHaveAttribute(
      "href",
      "/fixtures/pilot/chuyen-de-06/dong-hoa-hoc",
    );
    expect(
      screen.getByRole("link", {
        name: "dung-dich-va-can-bang-hoa-hoc",
      }),
    ).toHaveAttribute(
      "href",
      "/fixtures/pilot/chuyen-de-08/dung-dich-va-can-bang-hoa-hoc",
    );
  });

  it("shows the staging banner and QA counts", () => {
    render(<PilotIndexPage />);

    expect(screen.getByText(/BẢN NHÁP PILOT/)).toBeInTheDocument();
    expect(screen.getAllByText(/mục chặn/).length).toBeGreaterThan(0);
  });
});
