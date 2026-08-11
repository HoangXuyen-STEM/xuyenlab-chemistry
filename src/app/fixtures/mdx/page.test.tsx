import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Intercept the MDX import so the test doesn't need a full MDX compiler.
// The mock renders a sentinel element; if page.tsx stops importing and
// rendering the MDX file, this element will be absent and the test fails.
vi.mock("../../../../content/fixtures/mdx-renderer.mdx", () => ({
  default: () => (
    <section data-testid="mdx-fixture-content">
      <h1>Fixture kiểm tra renderer MDX</h1>
    </section>
  ),
}));

import MdxFixturePage from "./page";

afterEach(cleanup);

describe("MdxFixturePage", () => {
  it("imports and renders the MDX fixture file", () => {
    render(<MdxFixturePage />);
    expect(screen.getByTestId("mdx-fixture-content")).toBeInTheDocument();
  });

  it("renders the fixture banner", () => {
    render(<MdxFixturePage />);
    expect(screen.getByText(/Không phải bài học xuất bản/)).toBeInTheDocument();
  });

  it("renders MDX heading through the imported component", () => {
    render(<MdxFixturePage />);
    expect(
      screen.getByRole("heading", { name: "Fixture kiểm tra renderer MDX" }),
    ).toBeInTheDocument();
  });
});
