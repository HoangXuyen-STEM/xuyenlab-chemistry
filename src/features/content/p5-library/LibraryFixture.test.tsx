import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import manifestJson from "../../../../content/pilot-staging-manifest.json";

import { LibraryFixture, type FixtureState } from "./LibraryFixture";
import { loadPilotLibrary, type PilotLibraryLesson } from "./library";

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

  it("shows the page-level staging limitation notice", () => {
    renderFixture("populated");
    expect(
      screen.getByRole("note", { name: "Lưu ý bản đang duyệt" }),
    ).toHaveTextContent(/sử dụng dưới hướng dẫn giáo viên/u);
  });

  it("summarizes a synthetic lesson's accepted limitations with truthful neutral wording, not as resolved/fixed/approved", () => {
    render(
      <LibraryFixture
        lessons={[syntheticLesson({ acceptedLimitationsCount: 2 })]}
        query=""
        state="populated"
      />,
    );

    expect(
      screen.getByText("Giới hạn được lưu theo nguồn"),
    ).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    const text = document.body.textContent?.toLowerCase() ?? "";
    for (const forbidden of [
      "đã sửa",
      "đã khắc phục",
      "đã duyệt",
      "resolved",
      "fixed",
      "approved",
    ]) {
      expect(text).not.toContain(forbidden);
    }
  });
});

function syntheticLesson(
  overrides: Partial<PilotLibraryLesson>,
): PilotLibraryLesson {
  return {
    topic: "chuyen-de-06",
    topicTitle: "Chuyên đề 6",
    topicOrder: 6,
    title: "Bài học tổng hợp",
    slug: "synthetic-lesson",
    order: 1,
    summary: "Tóm tắt tổng hợp cho bài kiểm thử.",
    keywords: ["kiem-thu"],
    estimatedMinutes: 1,
    version: 1,
    status: "in_review",
    unresolvedBlocking: 0,
    unresolvedWarnings: 0,
    acceptedLimitationsCount: 0,
    href: "/fixtures/pilot/chuyen-de-06/synthetic-lesson",
    ...overrides,
  };
}

function renderFixture(state: FixtureState) {
  return render(
    <LibraryFixture
      lessons={state === "populated" ? loadPilotLibrary() : []}
      query=""
      state={state}
    />,
  );
}
