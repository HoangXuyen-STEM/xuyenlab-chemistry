import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { Solution } from "./Solution";

afterEach(cleanup);

describe("Solution", () => {
  it("renders the summary label 'Lời giải'", () => {
    render(<Solution>Đây là lời giải</Solution>);
    expect(screen.getByText("Lời giải")).toBeInTheDocument();
  });

  it("renders children inside the details", () => {
    render(<Solution>Đây là lời giải</Solution>);
    expect(screen.getByText("Đây là lời giải")).toBeInTheDocument();
  });

  it("is collapsed by default (no open attribute)", () => {
    const { container } = render(<Solution>Nội dung</Solution>);
    expect(container.querySelector("details")).not.toHaveAttribute("open");
  });

  it("uses a details element for native disclosure", () => {
    const { container } = render(<Solution>Nội dung</Solution>);
    expect(container.querySelector("details")).not.toBeNull();
    expect(container.querySelector("summary")).not.toBeNull();
  });
});
