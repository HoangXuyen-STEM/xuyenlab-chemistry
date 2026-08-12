import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { PilotHeadingNav } from "./PilotHeadingNav";

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

function renderArticleWithHeadings(headingTexts: string[]) {
  const article = document.createElement("article");
  article.id = "lesson-article";
  for (const text of headingTexts) {
    const heading = document.createElement("h2");
    heading.textContent = text;
    article.appendChild(heading);
  }
  document.body.appendChild(article);
}

describe("PilotHeadingNav", () => {
  it("renders nothing when the article has no headings", () => {
    renderArticleWithHeadings([]);
    const { container } = render(
      <PilotHeadingNav articleId="lesson-article" />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("lists every heading and assigns unique deep-link ids", () => {
    renderArticleWithHeadings(["I. Tốc độ phản ứng", "Ví dụ", "Ví dụ"]);
    render(<PilotHeadingNav articleId="lesson-article" />);

    expect(
      screen.getByRole("navigation", { name: "Mục lục bài học" }),
    ).toBeInTheDocument();
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(3);
    expect(links[0]).toHaveAttribute("href", "#i-toc-do-phan-ung");
    expect(links[1]).toHaveAttribute("href", "#vi-du");
    expect(links[2]).toHaveAttribute("href", "#vi-du-2");
  });

  it("writes the generated id back onto the heading element for deep-linking", () => {
    renderArticleWithHeadings(["Cân bằng hóa học"]);
    render(<PilotHeadingNav articleId="lesson-article" />);

    const heading = document.querySelector("h2");
    expect(heading?.id).toBe("can-bang-hoa-hoc");
  });
});
