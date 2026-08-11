import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TeacherOverview } from "./TeacherOverview";

describe("TeacherOverview", () => {
  it("is read-only and marks its table as a named region", () => {
    render(<TeacherOverview />);
    expect(
      screen.getByRole("region", { name: "Bảng tiến độ học sinh" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
