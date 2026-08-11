import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PrivateReader } from "./PrivateReader";
import { stagingPrivateReaderFacade } from "@/features/content/private-reader-facade";

describe("PrivateReader", () => {
  it("labels the synthetic lesson as staging-only and exposes keyboard-native controls", () => {
    render(
      <PrivateReader
        facade={stagingPrivateReaderFacade}
        progress={{
          completed: false,
          lastHeading: "can-bang-hoa-hoc",
          readPercent: 50,
        }}
      />,
    );

    expect(screen.getByText(/STAGING ONLY/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Bookmark" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Đã học xong" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "Mục lục bài học" }),
    ).toBeInTheDocument();
  });
});
