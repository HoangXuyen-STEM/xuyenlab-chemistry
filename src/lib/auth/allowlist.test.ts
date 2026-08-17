import { describe, expect, it, vi, beforeEach } from "vitest";

import { isAllowedEmail } from "./allowlist";

const { mockIsEmailAllowed } = vi.hoisted(() => ({
  mockIsEmailAllowed: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  getDatabase: () => ({}),
}));

vi.mock("@/lib/db/allowlist.repo", () => ({
  createAllowlistRepository: () => ({
    isEmailAllowed: mockIsEmailAllowed,
  }),
}));

beforeEach(() => {
  mockIsEmailAllowed.mockReset();
  delete process.env.TEACHER_EMAILS;
});

describe("isAllowedEmail", () => {
  it("returns false for empty email", async () => {
    expect(await isAllowedEmail("")).toBe(false);
    expect(await isAllowedEmail("   ")).toBe(false);
  });

  it("automatically allows teacher emails configured in TEACHER_EMAILS env", async () => {
    process.env.TEACHER_EMAILS =
      "giao-vien@xuyenlab.edu.vn, admin@xuyenlab.edu.vn";

    expect(await isAllowedEmail("giao-vien@xuyenlab.edu.vn")).toBe(true);
    expect(await isAllowedEmail("  ADMIN@XUYENLAB.EDU.VN  ")).toBe(true);
    expect(mockIsEmailAllowed).not.toHaveBeenCalled();
  });

  it("queries allowlist repository for student emails", async () => {
    mockIsEmailAllowed.mockResolvedValue(true);

    const result = await isAllowedEmail("hoc-sinh@example.com");

    expect(result).toBe(true);
    expect(mockIsEmailAllowed).toHaveBeenCalledWith("hoc-sinh@example.com");
  });

  it("returns false when student email is not in allowlist repository", async () => {
    mockIsEmailAllowed.mockResolvedValue(false);

    const result = await isAllowedEmail("la-hoc-sinh@example.com");

    expect(result).toBe(false);
  });

  it("returns false if database connection fails", async () => {
    mockIsEmailAllowed.mockRejectedValue(new Error("DB connection failed"));

    const result = await isAllowedEmail("hoc-sinh@example.com");

    expect(result).toBe(false);
  });
});
