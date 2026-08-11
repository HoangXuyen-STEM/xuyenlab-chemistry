import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { Example } from "./Example";

afterEach(cleanup);

describe("Example", () => {
  it("renders children", () => {
    render(<Example>Nội dung ví dụ</Example>);
    expect(screen.getByText("Nội dung ví dụ")).toBeInTheDocument();
  });

  it("renders title when provided", () => {
    render(<Example title="Ví dụ 1">Nội dung</Example>);
    expect(screen.getByText("Ví dụ 1")).toBeInTheDocument();
  });

  it("does not render title element when title is omitted", () => {
    const { container } = render(<Example>Nội dung</Example>);
    expect(container.querySelector("p")).toBeNull();
  });

  it("uses title as accessible label", () => {
    render(<Example title="Ví dụ 2">Nội dung</Example>);
    expect(screen.getByRole("region", { name: "Ví dụ 2" })).toBeInTheDocument();
  });

  it("falls back to 'Ví dụ' as label when no title", () => {
    render(<Example>Nội dung</Example>);
    expect(screen.getByRole("region", { name: "Ví dụ" })).toBeInTheDocument();
  });
});
