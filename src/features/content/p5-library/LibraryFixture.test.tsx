import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import manifestJson from "../../../../content/pilot-staging-manifest.json";

import { LibraryFixture, type FixtureState } from "./LibraryFixture";
import { loadPilotLibrary } from "./library";

afterEach(cleanup);

describe("P5 LibraryFixture", () => {
  it("renders populated pilot cards without account controls", () => {
    renderFixture("populated");

    const inReviewCount = manifestJson.lessons.filter(
      (lesson) => lesson.status === "in_review",
    ).length;
    expect(screen.getAllByText("in_review")).toHaveLength(inReviewCount);
    expect(screen.getAllByText(/QA chưa xử lý/u)).toHaveLength(inReviewCount);
    expect(
      screen.queryByRole("link", { name: /đăng nhập/iu }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /tài khoản|tiến độ/iu }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(screen.getByRole("search")).toBeInTheDocument();
  });

  it.each([
    ["loading", "Đang tải nội dung"],
    ["error", "Không thể tải metadata pilot"],
    ["empty", "Chưa có nội dung đang duyệt"],
  ] as const)("renders the %s direct state", (state, expected) => {
    renderFixture(state);
    if (state === "loading") {
      expect(screen.getByLabelText(expected)).toBeInTheDocument();
    } else {
      expect(screen.getByText(expected)).toBeInTheDocument();
    }
  });

  it("keeps the retry keyboard-operable as a link to populated state", () => {
    renderFixture("error");
    expect(screen.getByRole("link", { name: "Thử lại" })).toHaveAttribute(
      "href",
      "/fixtures/p5/library?state=populated",
    );
  });

  it("distinguishes a no-result query from an empty corpus", () => {
    render(
      <LibraryFixture lessons={[]} query="không tồn tại" state="populated" />,
    );
    expect(
      screen.getByText("Không tìm thấy kết quả cho “không tồn tại”"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Chưa có nội dung đang duyệt"),
    ).not.toBeInTheDocument();
  });
});

function renderFixture(state: FixtureState) {
  return render(
    <LibraryFixture
      lessons={state === "populated" ? loadPilotLibrary() : []}
      query=""
      state={state}
    />,
  );
}
