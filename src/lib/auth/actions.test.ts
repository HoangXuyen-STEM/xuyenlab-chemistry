import { describe, expect, it, vi, beforeEach } from "vitest";

import { initialAuthFormState } from "./form-state";

const { redirect, getNeonAuth, isAllowedEmail, markAllowedEmailVerified } =
  vi.hoisted(() => ({
    redirect: vi.fn(),
    getNeonAuth: vi.fn(),
    isAllowedEmail: vi.fn(),
    markAllowedEmailVerified: vi.fn(),
  }));

vi.mock("next/navigation", () => ({ redirect }));
vi.mock("./neon", () => ({ getNeonAuth }));
vi.mock("./allowlist", () => ({ isAllowedEmail, markAllowedEmailVerified }));

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
  isAllowedEmail.mockReset();
  markAllowedEmailVerified.mockReset();
  markAllowedEmailVerified.mockResolvedValue(undefined);
});

describe("signInWithPasswordAction", () => {
  it("rejects missing credentials", async () => {
    const state = await signInWithPasswordAction(
      initialAuthFormState,
      credentials("", ""),
    );
    expect(state.error).toMatch(/email và mật khẩu/i);
    expect(isAllowedEmail).not.toHaveBeenCalled();
    expect(getNeonAuth).not.toHaveBeenCalled();
  });

  it("rejects emails not on the allowlist before calling Neon Auth", async () => {
    isAllowedEmail.mockResolvedValue(false);

    const state = await signInWithPasswordAction(
      initialAuthFormState,
      credentials("revoked@example.com", "mat-khau-dung"),
    );

    expect(state.error).toMatch(/danh sách cho phép/);
    expect(getNeonAuth).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
    expect(markAllowedEmailVerified).not.toHaveBeenCalled();
  });

  it("signs in allowed users and marks verified", async () => {
    isAllowedEmail.mockResolvedValue(true);
    const signInEmail = vi.fn().mockResolvedValue({ error: null });
    getNeonAuth.mockResolvedValue({ signIn: { email: signInEmail } });

    await signInWithPasswordAction(
      initialAuthFormState,
      credentials("allowed@example.com", "mat-khau-dung"),
    );

    expect(signInEmail).toHaveBeenCalledWith({
      email: "allowed@example.com",
      password: "mat-khau-dung",
    });
    expect(markAllowedEmailVerified).toHaveBeenCalledWith(
      "allowed@example.com",
    );
    expect(redirect).toHaveBeenCalledWith("/thu-vien");
  });

  it("maps invalid credential errors", async () => {
    isAllowedEmail.mockResolvedValue(true);
    const signInEmail = vi.fn().mockResolvedValue({
      error: { code: "INVALID_CREDENTIALS", message: "invalid" },
    });
    getNeonAuth.mockResolvedValue({ signIn: { email: signInEmail } });

    const state = await signInWithPasswordAction(
      initialAuthFormState,
      credentials("allowed@example.com", "sai"),
    );

    expect(state.error).toMatch(/Email hoặc mật khẩu không đúng/);
    expect(redirect).not.toHaveBeenCalled();
    expect(markAllowedEmailVerified).not.toHaveBeenCalled();
  });

  it("returns connection error when Neon Auth throws", async () => {
    isAllowedEmail.mockResolvedValue(true);
    getNeonAuth.mockRejectedValue(new Error("network down"));

    const state = await signInWithPasswordAction(
      initialAuthFormState,
      credentials("allowed@example.com", "mat-khau-dung"),
    );

    expect(state.error).toMatch(/network down|Không thể kết nối/);
    expect(redirect).not.toHaveBeenCalled();
  });
});

describe("signUpWithPasswordAction", () => {
  it("rejects registration when email is not allowed", async () => {
    isAllowedEmail.mockResolvedValue(false);

    const state = await signUpWithPasswordAction(
      initialAuthFormState,
      credentials("unallowed-student@example.com", "password123"),
    );

    expect(state.error).toMatch(/danh sách cho phép/);
    expect(getNeonAuth).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("proceeds with sign-up when email is allowed and marks verified", async () => {
    isAllowedEmail.mockResolvedValue(true);
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
    expect(markAllowedEmailVerified).toHaveBeenCalledWith(
      "allowed-student@example.com",
    );
    expect(redirect).toHaveBeenCalledWith("/thu-vien");
  });
});
