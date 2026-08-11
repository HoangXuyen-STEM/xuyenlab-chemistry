import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../../content/fixtures/conversion-review/t06-docx.mdx", () => ({
  default: () => <div data-testid="t06-docx-samples">T06 DOCX samples</div>,
}));
vi.mock("../../../../content/fixtures/conversion-review/t06-html.mdx", () => ({
  default: () => <div data-testid="t06-html-samples">T06 HTML samples</div>,
}));
vi.mock("../../../../content/fixtures/conversion-review/t08-docx.mdx", () => ({
  default: () => <div data-testid="t08-docx-samples">T08 DOCX samples</div>,
}));
vi.mock("../../../../content/fixtures/conversion-review/t08-html.mdx", () => ({
  default: () => <div data-testid="t08-html-samples">T08 HTML samples</div>,
}));

import ConversionReviewPage from "./page";

afterEach(cleanup);

describe("ConversionReviewPage", () => {
  it("renders every imported converter review fixture", () => {
    render(<ConversionReviewPage />);

    expect(screen.getByTestId("t06-docx-samples")).toBeInTheDocument();
    expect(screen.getByTestId("t06-html-samples")).toBeInTheDocument();
    expect(screen.getByTestId("t08-docx-samples")).toBeInTheDocument();
    expect(screen.getByTestId("t08-html-samples")).toBeInTheDocument();
  });

  it("labels the route as staging-only and not published", () => {
    render(<ConversionReviewPage />);

    expect(screen.getByText(/STAGING REVIEW/)).toBeInTheDocument();
    expect(screen.getByText(/Không phải bài học xuất bản/)).toBeInTheDocument();
    expect(screen.getByText(/UNVERIFIED/)).toBeInTheDocument();
  });
});
