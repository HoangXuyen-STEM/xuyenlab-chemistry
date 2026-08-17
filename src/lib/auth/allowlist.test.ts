import { describe, expect, it, vi, beforeEach } from "vitest";

import { isAllowedEmail, markAllowedEmailVerified } from "./allowlist";

const { mockIsEmailAllowed, mockMarkEmailVerified } = vi.hoisted(() => ({
  mockIsEmailAllowed: vi.fn(),
  mockMarkEmailVerified: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  getDatabase: () => ({}),
}));

vi.mock("@/lib/db/allowlist.repo", () => ({
  createAllowlistRepository: () => ({
    isEmailAllowed: mockIsEmailAllowed,
    markEmailVerified: mockMarkEmailVerified,
  }),
}));

beforeEach(() => {
  mockIsEmailAllowed.mockReset();
  mockMarkEmailVerified.mockReset();
  delete process.env.TEACHER_EMAILS;
  delete process.env.DATABASE_URL;
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
    process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/db";
    mockIsEmailAllowed.mockResolvedValue(true);

    const result = await isAllowedEmail("hoc-sinh@example.com");

    expect(result).toBe(true);
    expect(mockIsEmailAllowed).toHaveBeenCalledWith("hoc-sinh@example.com");
  });

  it("returns false when student email is not in allowlist repository", async () => {
    process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/db";
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

describe("markAllowedEmailVerified", () => {
  it("no-ops for empty and teacher emails", async () => {
    process.env.TEACHER_EMAILS = "giao-vien@xuyenlab.edu.vn";
    await markAllowedEmailVerified("");
    await markAllowedEmailVerified("giao-vien@xuyenlab.edu.vn");
    expect(mockMarkEmailVerified).not.toHaveBeenCalled();
  });

  it("marks student emails via repository", async () => {
    mockMarkEmailVerified.mockResolvedValue(true);
    await markAllowedEmailVerified("  Hoc-Sinh@Example.com ");
    expect(mockMarkEmailVerified).toHaveBeenCalledWith("hoc-sinh@example.com");
  });

  it("swallows repository errors", async () => {
    mockMarkEmailVerified.mockRejectedValue(new Error("db down"));
    await expect(
      markAllowedEmailVerified("hoc-sinh@example.com"),
    ).resolves.toBeUndefined();
  });
});
