import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { Callout } from "./Callout";

afterEach(cleanup);

describe("Callout", () => {
  it("renders children", () => {
    render(<Callout type="note">Đây là lưu ý quan trọng</Callout>);
    expect(screen.getByText("Đây là lưu ý quan trọng")).toBeInTheDocument();
  });

  it("shows 'Lưu ý' label for note type", () => {
    render(<Callout type="note">Nội dung</Callout>);
    expect(screen.getByText("Lưu ý")).toBeInTheDocument();
  });

  it("shows 'Cảnh báo' label for warning type", () => {
    render(<Callout type="warning">Nội dung</Callout>);
    expect(screen.getByText("Cảnh báo")).toBeInTheDocument();
  });

  it("shows 'Định nghĩa' label for definition type", () => {
    render(<Callout type="definition">Nội dung</Callout>);
    expect(screen.getByText("Định nghĩa")).toBeInTheDocument();
  });

  it("renders an optional title", () => {
    render(
      <Callout type="note" title="Nhiệt động lực học">
        Nội dung
      </Callout>,
    );
    expect(screen.getByText("Nhiệt động lực học")).toBeInTheDocument();
  });

  it("uses the title as accessible label when provided", () => {
    render(
      <Callout type="note" title="Quy tắc đặc biệt">
        Nội dung
      </Callout>,
    );
    expect(
      screen.getByRole("complementary", { name: "Quy tắc đặc biệt" }),
    ).toBeInTheDocument();
  });

  it("falls back to type label as accessible label when no title", () => {
    render(<Callout type="warning">Nội dung</Callout>);
    expect(
      screen.getByRole("complementary", { name: "Cảnh báo" }),
    ).toBeInTheDocument();
  });

  it("renders an aside element", () => {
    const { container } = render(<Callout type="note">Nội dung</Callout>);
    expect(container.querySelector("aside")).not.toBeNull();
  });
});
