import { describe, expect, it, vi, beforeEach } from "vitest";

const { redirect, getNeonAuth, isAllowedEmail, markAllowedEmailVerified } =
  vi.hoisted(() => ({
    redirect: vi.fn((url: string) => {
      throw new Error(`REDIRECT:${url}`);
    }),
    getNeonAuth: vi.fn(),
    isAllowedEmail: vi.fn(),
    markAllowedEmailVerified: vi.fn(),
  }));

vi.mock("next/navigation", () => ({ redirect }));
vi.mock("./neon", () => ({ getNeonAuth }));
vi.mock("./allowlist", () => ({ isAllowedEmail, markAllowedEmailVerified }));

import { getSessionUser, requireTeacher, requireUser } from "./server";

beforeEach(() => {
  redirect.mockClear();
  getNeonAuth.mockReset();
  isAllowedEmail.mockReset();
  markAllowedEmailVerified.mockReset();
  markAllowedEmailVerified.mockResolvedValue(undefined);
  delete process.env.TEACHER_EMAILS;
});

describe("getSessionUser", () => {
  it("returns null when Neon Auth has no user", async () => {
    getNeonAuth.mockResolvedValue({
      getSession: vi.fn().mockResolvedValue({ data: null }),
    });
    await expect(getSessionUser()).resolves.toBeNull();
  });

  it("maps teacher role from TEACHER_EMAILS", async () => {
    process.env.TEACHER_EMAILS = "gv@xuyenlab.edu.vn";
    getNeonAuth.mockResolvedValue({
      getSession: vi.fn().mockResolvedValue({
        data: {
          user: {
            id: "u1",
            email: "gv@xuyenlab.edu.vn",
            name: "GV",
            image: null,
          },
        },
      }),
    });

    await expect(getSessionUser()).resolves.toEqual({
      id: "u1",
      email: "gv@xuyenlab.edu.vn",
      name: "GV",
      image: null,
      role: "teacher",
    });
  });
});

describe("requireUser", () => {
  it("redirects unauthenticated users to login", async () => {
    getNeonAuth.mockResolvedValue({
      getSession: vi.fn().mockResolvedValue({ data: null }),
    });

    await expect(requireUser()).rejects.toThrow("REDIRECT:/dang-nhap");
  });

  it("signs out and redirects when session email is not allowlisted", async () => {
    const signOut = vi.fn().mockResolvedValue({});
    getNeonAuth.mockResolvedValue({
      getSession: vi.fn().mockResolvedValue({
        data: {
          user: {
            id: "u2",
            email: "revoked@example.com",
            name: null,
            image: null,
          },
        },
      }),
      signOut,
    });
    isAllowedEmail.mockResolvedValue(false);

    await expect(requireUser()).rejects.toThrow(/REDIRECT:\/dang-nhap\?error=/);
    expect(signOut).toHaveBeenCalled();
    expect(markAllowedEmailVerified).not.toHaveBeenCalled();
  });

  it("returns allowlisted user and marks verified", async () => {
    getNeonAuth.mockResolvedValue({
      getSession: vi.fn().mockResolvedValue({
        data: {
          user: {
            id: "u3",
            email: "ok@example.com",
            name: "OK",
            image: null,
          },
        },
      }),
    });
    isAllowedEmail.mockResolvedValue(true);

    await expect(requireUser()).resolves.toEqual({
      id: "u3",
      email: "ok@example.com",
      name: "OK",
      image: null,
      role: "student",
    });
    expect(markAllowedEmailVerified).toHaveBeenCalledWith("ok@example.com");
  });
});

describe("requireTeacher", () => {
  it("redirects students to library", async () => {
    getNeonAuth.mockResolvedValue({
      getSession: vi.fn().mockResolvedValue({
        data: {
          user: {
            id: "u4",
            email: "hs@example.com",
            name: null,
            image: null,
          },
        },
      }),
    });
    isAllowedEmail.mockResolvedValue(true);

    await expect(requireTeacher()).rejects.toThrow("REDIRECT:/thu-vien");
  });
});
