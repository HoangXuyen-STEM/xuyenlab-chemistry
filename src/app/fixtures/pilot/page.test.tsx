import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import manifestJson from "../../../../content/pilot-staging-manifest.json";

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

  it("shows the staging banner, QA counts and each manifest lesson's status", () => {
    render(<PilotIndexPage />);

    expect(screen.getByText(/BẢN NHÁP PILOT/)).toBeInTheDocument();
    expect(screen.getAllByText(/mục chặn/).length).toBeGreaterThan(0);
    for (const lesson of manifestJson.lessons) {
      const card = screen
        .getByRole("link", { name: lesson.slug })
        .closest("li");
      expect(card).not.toBeNull();
      expect(within(card!).getByTestId("lesson-status").textContent).toBe(
        lesson.status,
      );
    }
  });

  it("labels Topic 24 specifically with its own manifest status, not just any card", () => {
    render(<PilotIndexPage />);

    // Regression: the aggregate loop above proves every card shows SOME
    // status, but not that a specific card shows its OWN status. Bind this
    // explicitly to Topic 24's own card so a future lesson swap can't
    // accidentally satisfy the loop while mislabeling this one lesson —
    // without assuming what that status currently is (draft today,
    // in_review once P6-B1.4 promotes it for real).
    const topic24Entry = manifestJson.lessons.find(
      (lesson) => lesson.slug === "phan-bon-hoa-hoc",
    );
    expect(topic24Entry).toBeDefined();

    const phanBonCard = screen
      .getByRole("link", { name: "phan-bon-hoa-hoc" })
      .closest("li");
    expect(phanBonCard).not.toBeNull();
    expect(within(phanBonCard!).getByTestId("lesson-status").textContent).toBe(
      topic24Entry!.status,
    );

    const dongHoaHocEntry = manifestJson.lessons.find(
      (lesson) => lesson.slug === "dong-hoa-hoc",
    );
    expect(dongHoaHocEntry).toBeDefined();

    const dongHoaHocCard = screen
      .getByRole("link", { name: "dong-hoa-hoc" })
      .closest("li");
    expect(dongHoaHocCard).not.toBeNull();
    expect(
      within(dongHoaHocCard!).getByTestId("lesson-status").textContent,
    ).toBe(dongHoaHocEntry!.status);
  });
});
