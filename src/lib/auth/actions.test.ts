import { describe, expect, it, vi, beforeEach } from "vitest";

import { initialAuthFormState } from "./form-state";

const { redirect, getNeonAuth, isAllowedEmail } = vi.hoisted(() => ({
  redirect: vi.fn(),
  getNeonAuth: vi.fn(),
  isAllowedEmail: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect }));
vi.mock("./neon", () => ({ getNeonAuth }));
vi.mock("./allowlist", () => ({ isAllowedEmail }));

import { signInWithPasswordAction, signUpWithPasswordAction } from "./actions";

function credentials(email: string, password: string): FormData {
  const formData = new FormData();
  formData.set("email", email);
  formData.set("password", password);
  return formData;
}

beforeEach(() => {
  redirect.mockReset();
  getNeonAuth.mockReset();
  vi.mocked(isAllowedEmail).mockReset();
});

describe("signInWithPasswordAction", () => {
  it("rejects empty credentials without calling the provider", async () => {
    const state = await signInWithPasswordAction(
      initialAuthFormState,
      credentials("", ""),
    );

    expect(state.error).toBe("Vui lòng nhập email và mật khẩu.");
    expect(getNeonAuth).not.toHaveBeenCalled();
  });

  it("does not forward the provider message for a failed sign-in", async () => {
    getNeonAuth.mockResolvedValue({
      signIn: {
        email: vi.fn().mockResolvedValue({
          error: {
            code: "INVALID_EMAIL_OR_PASSWORD",
            message: "User not found",
          },
        }),
      },
    });

    const state = await signInWithPasswordAction(
      initialAuthFormState,
      credentials("hoc-sinh@example.com", "sai-mat-khau"),
    );

    expect(state.error).toBe("Email hoặc mật khẩu không đúng.");
    expect(redirect).not.toHaveBeenCalled();
  });

  it("explains an unverified email", async () => {
    getNeonAuth.mockResolvedValue({
      signIn: {
        email: vi
          .fn()
          .mockResolvedValue({ error: { code: "EMAIL_NOT_VERIFIED" } }),
      },
    });

    const state = await signInWithPasswordAction(
      initialAuthFormState,
      credentials("hoc-sinh@example.com", "mat-khau-dung"),
    );

    expect(state.error).toMatch(/chưa được xác minh/);
  });

  it("signs in with the normalized email and redirects to the library", async () => {
    const signInEmail = vi.fn().mockResolvedValue({ error: null });
    getNeonAuth.mockResolvedValue({ signIn: { email: signInEmail } });

    await signInWithPasswordAction(
      initialAuthFormState,
      credentials("  HocSinh@Example.COM ", "mat-khau-dung"),
    );

    expect(signInEmail).toHaveBeenCalledWith({
      email: "hocsinh@example.com",
      password: "mat-khau-dung",
    });
    expect(redirect).toHaveBeenCalledWith("/thu-vien");
  });

  it("reports an unreachable provider instead of crashing the form", async () => {
    // The `catch` marks the deliberate failure as observed so Vitest does not
    // report it as an unhandled rejection.
    const unreachable = Promise.reject(new Error("fetch failed"));
    unreachable.catch(() => {});
    getNeonAuth.mockReturnValue(unreachable);

    const state = await signInWithPasswordAction(
      initialAuthFormState,
      credentials("hoc-sinh@example.com", "mat-khau-dung"),
    );

    expect(state.error).toMatch(/Không thể kết nối/);
    expect(redirect).not.toHaveBeenCalled();
  });
});

describe("signUpWithPasswordAction", () => {
  it("rejects registration when email is not allowed", async () => {
    vi.mocked(isAllowedEmail).mockResolvedValue(false);

    const state = await signUpWithPasswordAction(
      initialAuthFormState,
      credentials("unallowed-student@example.com", "password123"),
    );

    expect(state.error).toMatch(/danh sách cho phép/);
    expect(getNeonAuth).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("proceeds with sign-up when email is allowed", async () => {
    vi.mocked(isAllowedEmail).mockResolvedValue(true);
    const signUpEmail = vi.fn().mockResolvedValue({ error: null });
    getNeonAuth.mockResolvedValue({ signUp: { email: signUpEmail } });

    await signUpWithPasswordAction(
      initialAuthFormState,
      credentials("allowed-student@example.com", "password123"),
    );

    expect(signUpEmail).toHaveBeenCalledWith({
      email: "allowed-student@example.com",
      password: "password123",
      name: "allowed-student",
    });
    expect(redirect).toHaveBeenCalledWith("/thu-vien");
  });
});
