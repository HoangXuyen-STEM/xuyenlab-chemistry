import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PilotPrintButton } from "./PilotPrintButton";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("PilotPrintButton", () => {
  it("calls window.print on click", () => {
    const printSpy = vi.fn();
    vi.stubGlobal("print", printSpy);
    render(<PilotPrintButton />);

    fireEvent.click(screen.getByRole("button", { name: "In / Lưu PDF" }));

    expect(printSpy).toHaveBeenCalledTimes(1);
  });
});
