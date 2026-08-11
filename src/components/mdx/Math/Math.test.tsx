import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { Math } from "./Math";

// String.raw preserves backslashes for LaTeX formulas.
const r = String.raw;

afterEach(cleanup);

describe("Math", () => {
  it("renders inline math without throwing", () => {
    const { container } = render(<Math formula={r`E = mc^2`} />);
    const span = container.querySelector("span");
    expect(span).not.toBeNull();
    expect(span?.innerHTML).toContain("katex");
  });

  it("renders display math in a div", () => {
    const { container } = render(
      <Math formula={r`\int_0^\infty e^{-x}\,dx = 1`} display />,
    );
    const div = container.querySelector("div");
    expect(div).not.toBeNull();
    expect(div?.innerHTML).toContain("katex");
  });

  it("renders mhchem chemistry notation", () => {
    const { container } = render(<Math formula={r`\ce{H2O}`} />);
    const span = container.querySelector("span");
    expect(span).not.toBeNull();
    expect(span?.innerHTML.length).toBeGreaterThan(0);
  });

  it("renders chemical reaction with mhchem", () => {
    const { container } = render(
      <Math formula={r`\ce{2H2 + O2 -> 2H2O}`} display />,
    );
    expect(container.querySelector("div")).not.toBeNull();
  });

  it("does not throw on invalid LaTeX when throwOnError is false", () => {
    expect(() => render(<Math formula={r`\invalid`} />)).not.toThrow();
  });

  it("uses displayMode for display variant", () => {
    const { container } = render(
      <Math formula={r`K_c = \frac{[\text{C}]}{[\text{A}]}`} display />,
    );
    const html = container.innerHTML;
    expect(html).toContain("display");
  });
});
