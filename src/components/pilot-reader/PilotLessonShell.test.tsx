import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import type { PilotLessonManifestEntry } from "@/features/content/pilot-manifest";

import { PilotLessonShell } from "./PilotLessonShell";

afterEach(cleanup);

const manifest: PilotLessonManifestEntry = {
  topic: "chuyen-de-06",
  slug: "dong-hoa-hoc",
  sourceId: "T06-S01",
  sourcePath: "6. Chuyen de 6. Dong hoa hoc.ok.docx",
  blockingCount: 96,
  warningCount: 3,
  status: "in_review",
};

describe("PilotLessonShell", () => {
  it("renders the staging banner, provenance and QA counts without hiding them", () => {
    render(
      <PilotLessonShell
        articleId="dong-hoa-hoc-body"
        lessonTitle="Động hóa học"
        manifest={manifest}
        summary="Bản nháp pilot Phần I."
        topicTitle="Chuyên đề 6"
      >
        <p>Nội dung bài học.</p>
      </PilotLessonShell>,
    );

    expect(screen.getByText(/BẢN NHÁP PILOT/)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: "Động hóa học" }),
    ).toBeInTheDocument();
    expect(screen.getByText("T06-S01")).toBeInTheDocument();
    expect(
      screen.getByText("6. Chuyen de 6. Dong hoa hoc.ok.docx"),
    ).toBeInTheDocument();
    expect(screen.getByText(/96 mục chặn xuất bản/)).toBeInTheDocument();
    expect(screen.getByText(/3 cảnh báo/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "In / Lưu PDF" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Nội dung bài học.")).toBeInTheDocument();
  });

  it("links back to the pilot index", () => {
    render(
      <PilotLessonShell
        articleId="dong-hoa-hoc-body"
        lessonTitle="Động hóa học"
        manifest={manifest}
        summary="Bản nháp pilot Phần I."
        topicTitle="Chuyên đề 6"
      >
        <p>Nội dung bài học.</p>
      </PilotLessonShell>,
    );

    expect(
      screen.getByRole("link", { name: "Danh sách pilot" }),
    ).toHaveAttribute("href", "/fixtures/pilot");
  });
});
