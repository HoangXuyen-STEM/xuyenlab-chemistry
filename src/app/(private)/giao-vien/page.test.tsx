import { describe, expect, it, vi } from "vitest";

const { redirect } = vi.hoisted(() => ({ redirect: vi.fn() }));

vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/features/content/private-reader-facade", () => ({
  stagingPrivateReaderFacade: {
    getViewer: vi.fn().mockResolvedValue({ role: "student" }),
  },
}));

import TeacherPage from "./page";

describe("TeacherPage", () => {
  it("does not render teacher UI for a student viewer", async () => {
    await TeacherPage();
    expect(redirect).toHaveBeenCalledWith("/khong-co-quyen");
  });
});
