import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { DataTable } from "./DataTable";

afterEach(cleanup);

function TableContent() {
  return (
    <>
      <thead>
        <tr>
          <th>Chất</th>
          <th>Nồng độ (mol/L)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>H₂</td>
          <td>0.5</td>
        </tr>
        <tr>
          <td>N₂</td>
          <td>0.3</td>
        </tr>
      </tbody>
    </>
  );
}

describe("DataTable", () => {
  it("renders a table element", () => {
    const { container } = render(
      <DataTable>
        <TableContent />
      </DataTable>,
    );
    expect(container.querySelector("table")).not.toBeNull();
  });

  it("renders children (thead and tbody)", () => {
    render(
      <DataTable>
        <TableContent />
      </DataTable>,
    );
    expect(screen.getByText("Chất")).toBeInTheDocument();
    expect(screen.getByText("H₂")).toBeInTheDocument();
  });

  it("renders caption element when caption is provided", () => {
    const { container } = render(
      <DataTable caption="Bảng hằng số cân bằng">
        <TableContent />
      </DataTable>,
    );
    expect(container.querySelector("caption")).not.toBeNull();
    expect(screen.getByText("Bảng hằng số cân bằng")).toBeInTheDocument();
  });

  it("does not render caption element when omitted", () => {
    const { container } = render(
      <DataTable>
        <TableContent />
      </DataTable>,
    );
    expect(container.querySelector("caption")).toBeNull();
  });

  it("wraps table in a scrollable region", () => {
    render(
      <DataTable caption="Bảng">
        <TableContent />
      </DataTable>,
    );
    expect(screen.getByRole("region", { name: "Bảng" })).toBeInTheDocument();
  });

  it("falls back to default aria-label when no caption", () => {
    render(
      <DataTable>
        <TableContent />
      </DataTable>,
    );
    expect(
      screen.getByRole("region", { name: "Bảng dữ liệu" }),
    ).toBeInTheDocument();
  });
});
