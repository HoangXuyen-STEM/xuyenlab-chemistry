import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import PilotIndexPage from "./page";

afterEach(cleanup);

describe("PilotIndexPage", () => {
  it("links to every pilot lesson route without requiring login", () => {
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
    // Regression: P6-B1.1 added a draft Topic 24 manifest entry; this link
    // must resolve to a real page, not 404.
    expect(
      screen.getByRole("link", { name: "phan-bon-hoa-hoc" }),
    ).toHaveAttribute("href", "/fixtures/pilot/chuyen-de-24/phan-bon-hoa-hoc");
  });

  it("shows the staging banner, QA counts and each lesson's own status", () => {
    render(<PilotIndexPage />);

    expect(screen.getByText(/BẢN NHÁP PILOT/)).toBeInTheDocument();
    expect(screen.getAllByText(/mục chặn/).length).toBeGreaterThan(0);
    // Regression: the manifest now holds lessons at different lifecycle
    // stages (in_review pilots + a draft T24); the index must show each
    // lesson's real status rather than assuming they all match.
    const statuses = screen
      .getAllByTestId("lesson-status")
      .map((node) => node.textContent);
    expect(statuses.filter((status) => status === "in_review")).toHaveLength(2);
    expect(statuses.filter((status) => status === "draft")).toHaveLength(1);
  });

  it("labels Topic 24 specifically as draft, not just any card", () => {
    render(<PilotIndexPage />);

    // Regression: the aggregate count above proves exactly one "draft" badge
    // exists, but not which card it belongs to. Bind it explicitly to
    // Topic 24's own card so a future lesson swap can't accidentally satisfy
    // the count while mislabeling which lesson is actually draft.
    const phanBonCard = screen
      .getByRole("link", { name: "phan-bon-hoa-hoc" })
      .closest("li");
    expect(phanBonCard).not.toBeNull();
    expect(within(phanBonCard!).getByTestId("lesson-status").textContent).toBe(
      "draft",
    );

    const dongHoaHocCard = screen
      .getByRole("link", { name: "dong-hoa-hoc" })
      .closest("li");
    expect(dongHoaHocCard).not.toBeNull();
    expect(
      within(dongHoaHocCard!).getByTestId("lesson-status").textContent,
    ).toBe("in_review");
  });
});
