import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { StagingLimitationNotice } from "./StagingLimitationNotice";

afterEach(cleanup);

describe("StagingLimitationNotice", () => {
  it("shows the exact required wording as a labelled, non-interactive note", () => {
    render(<StagingLimitationNotice />);

    const notice = screen.getByRole("note", { name: "Lưu ý bản đang duyệt" });
    expect(notice).toBeInTheDocument();
    expect(notice).toHaveTextContent(
      "Bản đang duyệt — sử dụng dưới hướng dẫn giáo viên. Một số giới hạn " +
        "chuyển đổi được giữ theo nguồn và không phải nội dung khoa học mới " +
        "do hệ thống xác nhận.",
    );
  });

  it("is not marked aria-hidden and is not behind any interactive control", () => {
    render(<StagingLimitationNotice />);

    const notice = screen.getByRole("note");
    expect(notice).not.toHaveAttribute("aria-hidden");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("does not describe staging as public or self-study", () => {
    render(<StagingLimitationNotice />);

    const text = screen.getByRole("note").textContent ?? "";
    for (const forbidden of ["công khai", "tự học", "tự do sử dụng"]) {
      expect(text).not.toContain(forbidden);
    }
  });
});
