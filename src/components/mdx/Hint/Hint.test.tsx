import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { Hint } from "./Hint";

afterEach(cleanup);

describe("Hint", () => {
  it("renders the summary label 'Gợi ý'", () => {
    render(<Hint>Đây là gợi ý</Hint>);
    expect(screen.getByText("Gợi ý")).toBeInTheDocument();
  });

  it("renders children inside the details", () => {
    render(<Hint>Đây là gợi ý</Hint>);
    expect(screen.getByText("Đây là gợi ý")).toBeInTheDocument();
  });

  it("is collapsed by default (no open attribute)", () => {
    const { container } = render(<Hint>Nội dung</Hint>);
    expect(container.querySelector("details")).not.toHaveAttribute("open");
  });

  it("uses a details element for native disclosure", () => {
    const { container } = render(<Hint>Nội dung</Hint>);
    expect(container.querySelector("details")).not.toBeNull();
    expect(container.querySelector("summary")).not.toBeNull();
  });
});
