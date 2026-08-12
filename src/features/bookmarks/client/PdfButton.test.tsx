import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PdfButton } from "./PdfButton";

function stubFetch(status: number, body: unknown = {}) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("open", vi.fn());
  return fetchMock;
}

function clickDownload() {
  fireEvent.click(screen.getByRole("button", { name: "Tải PDF" }));
}

// Testing Library's automatic cleanup only registers with Vitest globals, which
// this project does not enable.
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("PdfButton", () => {
  it("requests the authenticated endpoint and exposes the signed link", async () => {
    const fetchMock = stubFetch(200, {
      url: "https://r2.example.invalid/signed-pdf",
      expiresAt: new Date(Date.now() + 120_000).toISOString(),
    });
    render(<PdfButton lessonSlug="p3-can-bang-hoa-hoc" />);

    clickDownload();

    const link = await screen.findByRole("link", { name: "Mở PDF" });
    expect(link).toHaveAttribute(
      "href",
      "https://r2.example.invalid/signed-pdf",
    );
    expect(screen.getByRole("status")).toHaveTextContent(/hết hạn lúc/);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/pdf/p3-can-bang-hoa-hoc",
      expect.objectContaining({ credentials: "same-origin" }),
    );
  });

  it("offers re-authentication when the session is gone", async () => {
    stubFetch(401, {
      error: {
        code: "UNAUTHENTICATED",
        message: "Authentication is required.",
      },
    });
    render(<PdfButton lessonSlug="p3-can-bang-hoa-hoc" />);

    clickDownload();

    expect(
      await screen.findByRole("link", { name: "Đăng nhập lại" }),
    ).toHaveAttribute("href", "/dang-nhap");
  });

  it("reports a missing PDF without exposing the server message", async () => {
    stubFetch(404, {
      error: {
        code: "NOT_FOUND",
        message: "PDF is not available for this lesson.",
      },
    });
    render(<PdfButton lessonSlug="khong-co-pdf" />);

    clickDownload();

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Bài học này chưa có bản PDF.",
    );
  });
});
