import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ChemFigure } from "./ChemFigure";

afterEach(cleanup);

describe("ChemFigure", () => {
  it("renders the image with the provided alt text", () => {
    render(<ChemFigure src="/test.svg" alt="Sơ đồ phản ứng" />);
    expect(screen.getByAltText("Sơ đồ phản ứng")).toBeInTheDocument();
  });

  it("renders the image src", () => {
    render(<ChemFigure src="/fixtures/diagram.svg" alt="Hình minh họa" />);
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "/fixtures/diagram.svg");
  });

  it("renders caption when provided", () => {
    render(
      <ChemFigure
        src="/test.svg"
        alt="Sơ đồ"
        caption="Hình 1: Cân bằng hóa học"
      />,
    );
    expect(screen.getByText("Hình 1: Cân bằng hóa học")).toBeInTheDocument();
  });

  it("does not render figcaption when caption is omitted", () => {
    const { container } = render(<ChemFigure src="/test.svg" alt="Sơ đồ" />);
    expect(container.querySelector("figcaption")).toBeNull();
  });

  it("uses a figure element", () => {
    const { container } = render(<ChemFigure src="/test.svg" alt="Sơ đồ" />);
    expect(container.querySelector("figure")).not.toBeNull();
  });

  it("sets data-source-id when sourceId is provided", () => {
    const { container } = render(
      <ChemFigure src="/test.svg" alt="Sơ đồ" sourceId="src-042" />,
    );
    expect(
      container.querySelector("[data-source-id='src-042']"),
    ).not.toBeNull();
  });
});
